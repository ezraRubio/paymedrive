import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { uploadAPI, UploadStatus } from '../api/upload';
import { EventEmitter } from 'eventemitter3';

export interface UploadTask {
    id: string; // Unique ID for the task (local)
    fileUri: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    sessionId?: string; // Server session ID
    chunkSize?: number;
    progress: number; // 0-100
    status: 'pending' | 'uploading' | 'paused' | 'error' | 'completed';
    error?: string;
    createdAt: number;
    file?: File; // For Web: File object reference (not persisted)
}

const STORAGE_KEY = 'upload_queue';
const CONCURRENCY = 1; // Process one file at a time to save memory

class UploadManager extends EventEmitter {
    private queue: UploadTask[] = [];
    private isProcessing = false;
    private activeUploadId: string | null = null;
    private shouldStop = false;

    constructor() {
        super();
        this.loadQueue();
    }

    private async loadQueue() {
        try {
            const storedQueue = await AsyncStorage.getItem(STORAGE_KEY);
            if (storedQueue) {
                this.queue = JSON.parse(storedQueue);
                this.emit('update', this.queue);
                // Resume processing if there are pending items
                this.processQueue();
            }
        } catch (error) {
            console.error('Failed to load upload queue:', error);
        }
    }

    private async saveQueue() {
        try {
            // On Web, avoid persisting if queue is too large or contains huge URIs
            // We create a sanitized queue for storage
            const queueToSave = this.queue.map(task => {
                const { file, ...rest } = task; // Exclude File object
                // On Web, if fileUri is base64 (data:...), it might be too large.
                // We can't easily persist it. So we might lose resumability across reloads for this task.
                if (Platform.OS === 'web' && rest.fileUri.startsWith('data:')) {
                    // We can't save the full URI. 
                    // If we save a truncated one, we can't resume.
                    // So we skip saving this task to storage? Or save it but mark it as 'failed' on reload?
                    // For now, let's just not save the URI if it's huge.
                    // But wait, if we don't save it, we can't show it in the list on reload.
                    // Let's truncate it for display purposes? No, that breaks logic.
                    // Let's just NOT persist the queue on Web if it has active uploads with data URIs.
                    return rest;
                }
                return rest;
            });

            // Check size roughly?
            const stringified = JSON.stringify(queueToSave);
            if (Platform.OS === 'web' && stringified.length > 4 * 1024 * 1024) {
                //Upload queue too large to persist on Web
                return;
            }

            await AsyncStorage.setItem(STORAGE_KEY, stringified);
            this.emit('update', this.queue);
        } catch (error) {
            console.error('Failed to save upload queue:', error);
        }
    }

    async addToQueue(fileUri: string, fileName: string, fileSize: number, mimeType: string, fileObj?: File) {
        const task: UploadTask = {
            id: Date.now().toString(),
            fileUri,
            fileName,
            fileSize,
            mimeType,
            progress: 0,
            status: 'pending',
            createdAt: Date.now(),
            file: fileObj,
        };

        this.queue.push(task);
        await this.saveQueue();
        this.processQueue();
    }

    async pause(taskId: string) {
        const task = this.queue.find((t) => t.id === taskId);
        if (task) {
            if (task.status === 'uploading') {
                this.shouldStop = true; // Signal current upload loop to stop
            }
            task.status = 'paused';
            await this.saveQueue();
        }
    }

    async resume(taskId: string) {
        const task = this.queue.find((t) => t.id === taskId);
        if (task) {
            // On Web, if we don't have the File object (e.g. after reload), we can't resume
            if (Platform.OS === 'web' && !task.file && task.fileUri.startsWith('data:')) {
                task.status = 'error';
                task.error = 'Cannot resume: File reference lost';
                this.emit('update', this.queue);
                return;
            }

            task.status = 'pending';
            task.error = undefined;
            await this.saveQueue();
            this.processQueue();
        }
    }

    async cancel(taskId: string) {
        const taskIndex = this.queue.findIndex((t) => t.id === taskId);
        if (taskIndex !== -1) {
            const task = this.queue[taskIndex];
            if (task.status === 'uploading') {
                this.shouldStop = true;
            }

            if (task.sessionId) {
                try {
                    await uploadAPI.cancelUpload(task.sessionId);
                } catch (e) {
                    console.warn('Failed to cancel session on server:', e);
                }
            }

            this.queue.splice(taskIndex, 1);
            await this.saveQueue();
        }
    }

    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            while (true) {
                const nextTask = this.queue.find((t) => t.status === 'pending');
                if (!nextTask) break;

                this.activeUploadId = nextTask.id;
                this.shouldStop = false;
                nextTask.status = 'uploading';
                await this.saveQueue();

                try {
                    await this.processTask(nextTask);
                    if (nextTask.status === 'uploading') {
                        nextTask.status = 'completed';
                        nextTask.progress = 100;
                        await this.saveQueue();
                        this.emit('completed', nextTask);
                    }
                } catch (error: any) {
                    console.error(`Upload failed for task ${nextTask.id}:`, error);
                    // Re-read status in case it changed
                    if (nextTask.status as string !== 'paused') {
                        nextTask.status = 'error';
                        nextTask.error = error.message || 'Upload failed';
                        await this.saveQueue();
                    }
                }

                this.activeUploadId = null;
            }
        } finally {
            this.isProcessing = false;
        }
    }

    private async processTask(task: UploadTask): Promise<void> {
        // 1. Initiate Session if needed
        if (!task.sessionId) {
            const session = await uploadAPI.initiateUpload(
                task.fileName,
                task.fileSize,
                task.mimeType
            );
            task.sessionId = session.sessionId;
            task.chunkSize = session.chunkSize;
            await this.saveQueue();
        }

        if (!task.chunkSize) throw new Error('Chunk size missing');

        // 2. Get Status (to resume)
        let uploadedChunks: number[] = [];
        try {
            const status = await uploadAPI.getUploadStatus(task.sessionId);
            if (status.status === 'completed') {
                task.status = 'completed';
                task.progress = 100;
                this.emit('completed', task);
                return;
            }
            uploadedChunks = status.uploadedChunks;
        } catch (e) {
            // If 404, session expired or lost. Reset session.
            task.sessionId = undefined;
            await this.saveQueue();
            // Retry recursively
            return this.processTask(task);
        }

        const totalChunks = Math.ceil(task.fileSize / task.chunkSize);

        // 3. Upload Chunks
        for (let i = 0; i < totalChunks; i++) {
            if (this.shouldStop) {
                task.status = 'paused';
                await this.saveQueue();
                return;
            }

            if (uploadedChunks.includes(i)) {
                // Update progress
                task.progress = Math.floor(((i + 1) / totalChunks) * 100);
                this.emit('progress', { id: task.id, progress: task.progress });
                continue;
            }

            // Read chunk
            const start = i * task.chunkSize;
            const end = Math.min(start + task.chunkSize, task.fileSize);
            const length = end - start;

            let chunkData: any; // Blob (Web) or URI string (Native)
            let tempUri = '';

            if (Platform.OS === 'web') {
                if (!task.file) {
                    throw new Error('File object missing for Web upload');
                }
                // On Web, slice returns a Blob
                chunkData = task.file.slice(start, end);
            } else {
                // Native: Read as base64 and write to temp file
                const chunkBase64 = await FileSystem.readAsStringAsync(task.fileUri, {
                    encoding: FileSystem.EncodingType.Base64,
                    position: start,
                    length: length,
                });

                tempUri = FileSystem.cacheDirectory + `chunk_${task.sessionId}_${i}`;
                await FileSystem.writeAsStringAsync(tempUri, chunkBase64, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                chunkData = tempUri;
            }

            // Upload
            try {
                await uploadAPI.uploadChunkFile(task.sessionId, chunkData, i);

                // Update local state
                uploadedChunks.push(i);
                task.progress = Math.floor(((i + 1) / totalChunks) * 100);
                this.emit('progress', { id: task.id, progress: task.progress });

                if (i % 5 === 0) await this.saveQueue();

            } finally {
                // Cleanup
                if (Platform.OS !== 'web') {
                    await FileSystem.deleteAsync(tempUri, { idempotent: true });
                }
            }
        }

        // 4. Complete
        await uploadAPI.completeUpload(task.sessionId);
    }

    getQueue() {
        return this.queue;
    }
}

export const uploadManager = new UploadManager();
