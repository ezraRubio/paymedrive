import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  FAB,
  List,
  Text,
  ActivityIndicator,
  IconButton,
  Searchbar,
  Snackbar,
  Portal,
  Dialog,
  Button,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { filesAPI, FileMetadata } from '../api/files';
import { uploadManager } from '../utils/UploadManager';
import { UploadProgress } from '../components/UploadProgress';

export const FilesScreen: React.FC = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileMetadata | null>(null);

  useEffect(() => {
    loadFiles();

    // Refresh list when an upload completes
    const handleCompletion = () => {
      loadFiles();
      showSnackbar('Upload completed successfully');
    };

    uploadManager.on('completed', handleCompletion);

    // We can keep 'update' if we want to reflect other changes, but for file list refresh 'completed' is key.
    // Let's keep 'update' for now just in case, but maybe not reload files on every update?
    // Actually, the previous code had an empty handleUpdate. Let's remove it or make it useful if needed.
    // For now, let's just listen to 'completed'.

    return () => {
      uploadManager.off('completed', handleCompletion);
    };
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = files.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFiles(filtered);
    } else {
      setFilteredFiles(files);
    }
  }, [searchQuery, files]);

  const loadFiles = async () => {
    try {
      const response = await filesAPI.listFiles();
      if (response.success) {
        setFiles(response.files);
        setFilteredFiles(response.files);
      }
    } catch (error: any) {
      showSnackbar(error.response?.data?.message || 'Failed to load files');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFiles();
  };

  const handleUpload = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          // Create a blob URI for the interface (UploadManager uses the File object directly on Web)
          const fileUri = URL.createObjectURL(file);

          await uploadManager.addToQueue(
            fileUri,
            file.name,
            file.size,
            file.type || 'application/octet-stream',
            file
          );
          showSnackbar('Added to upload queue');
        }
      };
      input.click();
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      // Add to upload queue
      await uploadManager.addToQueue(
        file.uri,
        file.name,
        file.size ?? 0,
        file.mimeType ?? 'application/octet-stream'
      );

      showSnackbar('Added to upload queue');

    } catch (error: any) {
      if (error.message === 'Download cancelled') {
        return;
      }
      showSnackbar(
        error.message || 'Failed to pick file'
      );
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      const { localUri, fileName } = await filesAPI.downloadFile(file.id, file.name);

      if (Platform.OS === 'web') {
        showSnackbar(`${fileName} downloaded successfully`);
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(localUri);
        } else {
          showSnackbar('File downloaded to: ' + localUri);
        }
      }
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.message || 'Failed to download file'
      );
    }
  };

  const handleDelete = (file: FileMetadata) => {
    setFileToDelete(file);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      await filesAPI.deleteFile(fileToDelete.id);
      showSnackbar(`"${fileToDelete.name}" deleted successfully`);
      loadFiles();
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.message || 'Failed to delete file'
      );
    } finally {
      setDeleteDialogVisible(false);
      setFileToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    setFileToDelete(null);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getFileIcon = (format: string): string => {
    const iconMap: { [key: string]: string } = {
      pdf: 'file-pdf-box',
      doc: 'file-word',
      docx: 'file-word',
      xls: 'file-excel',
      xlsx: 'file-excel',
      ppt: 'file-powerpoint',
      pptx: 'file-powerpoint',
      jpg: 'file-image',
      jpeg: 'file-image',
      png: 'file-image',
      gif: 'file-image',
      zip: 'zip-box',
      txt: 'file-document',
    };
    return iconMap[format.toLowerCase()] || 'file';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search files"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {filteredFiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            {searchQuery
              ? 'No files match your search'
              : 'No files yet. Upload your first file!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFiles}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={`${formatBytes(item.size)} • ${formatDate(
                item.createdAt
              )}`}
              left={(props) => (
                <List.Icon {...props} icon={getFileIcon(item.format)} />
              )}
              right={(props) => (
                <View style={styles.actions}>
                  <IconButton
                    icon="download"
                    onPress={() => handleDownload(item)}
                  />
                  <IconButton
                    icon="delete"
                    onPress={() => handleDelete(item)}
                  />
                </View>
              )}
            />
          )}
        />
      )}

      <UploadProgress />

      <FAB
        icon="plus"
        label="Upload"
        style={styles.fab}
        onPress={handleUpload}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={cancelDelete}>
          <Dialog.Title>Delete File</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete "{fileToDelete?.name}"? This
              action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={cancelDelete}>Cancel</Button>
            <Button onPress={confirmDelete} textColor="#d32f2f">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
