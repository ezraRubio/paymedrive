import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  FAB,
  List,
  Text,
  ActivityIndicator,
  IconButton,
  Searchbar,
  Snackbar,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { filesAPI, FileMetadata } from '../api/files';

export const FilesScreen: React.FC = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    loadFiles();
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
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      const response = await filesAPI.uploadFile(file.uri, file.name);
      if (response.success) {
        showSnackbar('File uploaded successfully');
        loadFiles();
      }
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.message || 'Failed to upload file'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      const { localUri } = await filesAPI.downloadFile(file.id);
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(localUri);
      } else {
        showSnackbar('File downloaded to: ' + localUri);
      }
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.message || 'Failed to download file'
      );
    }
  };

  const handleDelete = (file: FileMetadata) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await filesAPI.deleteFile(file.id);
              showSnackbar('File deleted');
              loadFiles();
            } catch (error: any) {
              showSnackbar(
                error.response?.data?.message || 'Failed to delete file'
              );
            }
          },
        },
      ]
    );
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

      <FAB
        icon={uploading ? 'loading' : 'plus'}
        label="Upload"
        style={styles.fab}
        onPress={handleUpload}
        disabled={uploading}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
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
