import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
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
} from "react-native-paper";
import * as Sharing from "expo-sharing";
import { filesAPI, FileMetadata } from "../api/files";
import { selectFile, formatFileSize as formatBytes } from "../utils/fileUpload.util";

export const FilesScreen: React.FC = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileMetadata | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = files.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase()),
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
      showSnackbar(error.response?.data?.message || "Failed to load files");
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
      const selectedFile = await selectFile();
      
      if (!selectedFile) return;

      setUploading(true);
      setUploadProgress(0);

      const response = await filesAPI.smartUpload(
        selectedFile,
        (progress) => {
          setUploadProgress(progress.percentage);
        }
      );
      
      if (response.success) {
        showSnackbar("File uploaded successfully");
        loadFiles();
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.message || error.response?.data?.error || "Failed to upload";
      showSnackbar(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      const { localUri, fileName } = await filesAPI.downloadFile(file.id);

      if (Platform.OS === "web") {
        showSnackbar(`${fileName} downloaded successfully`);
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(localUri);
        } else {
          showSnackbar("File downloaded to: " + localUri);
        }
      }
    } catch (error: any) {
      console.log(error);
      showSnackbar(error.response?.data?.message || "Failed to download file");
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
      showSnackbar(error.response?.data?.message || "Failed to delete file");
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


  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getFileIcon = (format: string): string => {
    const iconMap: { [key: string]: string } = {
      pdf: "file-pdf-box",
      doc: "file-word",
      docx: "file-word",
      xls: "file-excel",
      xlsx: "file-excel",
      ppt: "file-powerpoint",
      pptx: "file-powerpoint",
      jpg: "file-image",
      jpeg: "file-image",
      png: "file-image",
      gif: "file-image",
      zip: "zip-box",
      txt: "file-document",
    };
    return iconMap[format.toLowerCase()] || "file";
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
              ? "No files match your search"
              : "No files yet. Upload your first file!"}
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
                item.createdAt,
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
        icon={uploading ? "loading" : "plus"}
        label={uploading ? `${uploadProgress}%` : "Upload"}
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
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
