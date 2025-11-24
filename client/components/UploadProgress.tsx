import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, ProgressBar, IconButton, Button } from 'react-native-paper';
import { uploadManager, UploadTask } from '../utils/UploadManager';

export const UploadProgress: React.FC = () => {
    const [activeTask, setActiveTask] = useState<UploadTask | null>(null);
    const [queue, setQueue] = useState<UploadTask[]>([]);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const updateState = (currentQueue: UploadTask[]) => {
            setQueue(currentQueue);
            const active = currentQueue.find(t => t.status === 'uploading' || t.status === 'pending');
            setActiveTask(active || null);
        };

        const updateProgress = ({ id, progress }: { id: string; progress: number }) => {
            setActiveTask(prev => prev && prev.id === id ? { ...prev, progress } : prev);
        };

        uploadManager.on('update', updateState);
        uploadManager.on('progress', updateProgress);

        // Initial load
        updateState(uploadManager.getQueue());

        return () => {
            uploadManager.off('update', updateState);
            uploadManager.off('progress', updateProgress);
        };
    }, []);

    if (!activeTask && queue.length === 0) return null;

    const pendingCount = queue.filter(t => t.status === 'pending').length;
    const errorCount = queue.filter(t => t.status === 'error').length;

    return (
        <Surface style={styles.container} elevation={4}>
            <View style={styles.header}>
                <Text variant="titleMedium">
                    {activeTask ? 'Uploading...' : 'Uploads'}
                </Text>
                <IconButton
                    icon={expanded ? 'chevron-down' : 'chevron-up'}
                    onPress={() => setExpanded(!expanded)}
                />
            </View>

            {activeTask && (
                <View style={styles.activeTask}>
                    <Text variant="bodyMedium" numberOfLines={1}>{activeTask.fileName}</Text>
                    <ProgressBar progress={activeTask.progress / 100} style={styles.progressBar} />
                    <View style={styles.controls}>
                        <Text variant="bodySmall">{activeTask.progress}%</Text>
                        <Button onPress={() => uploadManager.pause(activeTask.id)}>Pause</Button>
                        <Button onPress={() => uploadManager.cancel(activeTask.id)}>Cancel</Button>
                    </View>
                </View>
            )}

            {expanded && (
                <View style={styles.queueList}>
                    {queue.map(task => (
                        <View key={task.id} style={styles.queueItem}>
                            <View style={{ flex: 1 }}>
                                <Text variant="bodySmall" numberOfLines={1}>{task.fileName}</Text>
                                <Text variant="labelSmall" style={{ color: getStatusColor(task.status) }}>
                                    {task.status} {task.error ? `(${task.error})` : ''}
                                </Text>
                            </View>
                            {task.status === 'paused' && (
                                <IconButton icon="play" size={20} onPress={() => uploadManager.resume(task.id)} />
                            )}
                            {task.status === 'error' && (
                                <IconButton icon="reload" size={20} onPress={() => uploadManager.resume(task.id)} />
                            )}
                            <IconButton icon="close" size={20} onPress={() => uploadManager.cancel(task.id)} />
                        </View>
                    ))}
                </View>
            )}

            {!activeTask && !expanded && (
                <Text variant="bodySmall">
                    {pendingCount} pending, {errorCount} failed
                </Text>
            )}
        </Surface>
    );
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'uploading': return '#2196F3';
        case 'completed': return '#4CAF50';
        case 'error': return '#F44336';
        case 'paused': return '#FF9800';
        default: return '#757575';
    }
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 80, // Above bottom tabs
        left: 16,
        right: 16,
        padding: 16,
        borderRadius: 8,
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    activeTask: {
        marginVertical: 8,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        marginVertical: 8,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    queueList: {
        marginTop: 8,
        maxHeight: 200,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
});
