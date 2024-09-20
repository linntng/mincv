import React, { useState, useEffect } from "react";
import {
  DefaultButton,
  Label,
  Checkbox,
  Stack,
  Text,
  SearchBox,
  MessageBar,
  MessageBarType,
  Icon,
} from "@fluentui/react";
import { BlobServiceClient } from "@azure/storage-blob";
import { InteractiveBrowserCredential } from "@azure/identity";
import LinnImage from "./Linn.jpeg";

const Ingestion = () => {
  const clientId = "xxx"; // Your Azure AD client ID
  const tenantId = "xxx"; // Your tenant ID
  const blobStorageUrl = "https://xxxx.blob.core.windows.net/"; // Blob Storage URL

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [statusType, setStatusType] = useState<MessageBarType>(
    MessageBarType.info
  );
  const [blobNames, setBlobNames] = useState<string[]>([]);
  const [selectedBlobs, setSelectedBlobs] = useState<string[]>([]);
  const [filteredBlobNames, setFilteredBlobNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isUploadSectionOpen, setIsUploadSectionOpen] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleBlobSelection = (blobName: string, isSelected: boolean) => {
    setSelectedBlobs((prev) =>
      isSelected ? [...prev, blobName] : prev.filter((name) => name !== blobName)
    );
  };

  const fetchBlobNames = async (blobServiceClient: BlobServiceClient) => {
    try {
      const containerClient = blobServiceClient.getContainerClient("content");
      const blobs = containerClient.listBlobsFlat();
      const blobList: string[] = [];
      for await (const blob of blobs) {
        blobList.push(blob.name);
      }
      setBlobNames(blobList);
      setFilteredBlobNames(blobList); // Initialize filtered list
    } catch (error) {
      setUploadStatus(`Failed to fetch blob names: ${(error as Error).message}`);
      setStatusType(MessageBarType.error);
    }
  };

  const triggerAzureFunction = async (operation: string) => {
    try {
      const response = await fetch(
        `https://xxx.azurewebsites.net/api/HttpTrigger1?code=xxxx`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operation }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to trigger the Azure Function");
      }

      setUploadStatus("Indeksering vellykket!");
      setStatusType(MessageBarType.success);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setUploadStatus(`Indeksering feilet: ${errorMessage}`);
      setStatusType(MessageBarType.error);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      setUploadStatus("Velg fil først.");
      setStatusType(MessageBarType.warning);
      return;
    }

    setUploadStatus("Laster opp...");
    setStatusType(MessageBarType.info);

    try {
      const credential = new InteractiveBrowserCredential({
        clientId,
        tenantId,
        redirectUri: window.location.origin,
      });

      const blobServiceClient = new BlobServiceClient(blobStorageUrl, credential);
      const containerClient = blobServiceClient.getContainerClient("content");
      const blobClient = containerClient.getBlockBlobClient(selectedFile.name);

      await blobClient.uploadData(selectedFile);
      setUploadStatus("Data er lastet opp!");
      setStatusType(MessageBarType.success);
      fetchBlobNames(blobServiceClient);
    } catch (error) {
      setUploadStatus(`Opplasting feilet: ${(error as Error).message}`);
      setStatusType(MessageBarType.error);
    }
  };

  const deleteSelectedBlobs = async () => {
    if (selectedBlobs.length === 0) {
      setUploadStatus("Velg filer å slette.");
      setStatusType(MessageBarType.warning);
      return;
    }

    try {
      const credential = new InteractiveBrowserCredential({
        clientId,
        tenantId,
        redirectUri: window.location.origin,
      });

      const blobServiceClient = new BlobServiceClient(blobStorageUrl, credential);
      const containerClient = blobServiceClient.getContainerClient("content");

      for (const blobName of selectedBlobs) {
        const blobClient = containerClient.getBlobClient(blobName);
        await blobClient.delete();
      }

      setUploadStatus("Filer er nå slettet!");
      setStatusType(MessageBarType.success);
      fetchBlobNames(blobServiceClient);
      setSelectedBlobs([]);
    } catch (error) {
      setUploadStatus(`Feil ved sletting: ${(error as Error).message}`);
      setStatusType(MessageBarType.error);
    }
  };

  const handleSearch = (event: any, newValue?: string) => {
    const query = newValue || "";
    setSearchQuery(query);

    if (query) {
      const filtered = blobNames.filter((name) =>
        name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredBlobNames(filtered);
    } else {
      setFilteredBlobNames(blobNames);
    }
  };

  useEffect(() => {
    const initializeBlobClient = async () => {
      const credential = new InteractiveBrowserCredential({
        clientId,
        tenantId,
        redirectUri: window.location.origin,
      });
      const blobServiceClient = new BlobServiceClient(blobStorageUrl, credential);
      await fetchBlobNames(blobServiceClient);
    };
    initializeBlobClient();
  }, []);

  return (
    <div style={{ display: "flex", gap: "20px", height: "100vh" }}>
      {/* Sidebar for Blob Storage list and controls */}
      <div
        className="sidebar"
        style={{
          width: "300px",
          padding: "20px",
          backgroundColor: "#f7f7f7",
          overflowY: "auto",
        }}
      >
        {/* Profile Section */}
        <div
          className="profileSection"
          style={{ marginBottom: "20px", textAlign: "center" }}
        >
          {/* Replace "Your Name" with your actual name */}
          <h2>Your Name</h2>
          {/* Replace "path_to_cv_picture.jpg" with the actual path to your image */}
          <img
            src={LinnImage}
            alt="CV"
            style={{
              width: "200px",
              height: "200px",
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: "10px",
            }}
          />
          <p>Your placeholder text goes here.</p>
        </div>

        {/* Upload Section */}
        <div className="uploadSection" style={{ marginBottom: "20px" }}>
          {/* Toggle Header */}
          <div
            onClick={() => setIsUploadSectionOpen(!isUploadSectionOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
              padding: "5px",
              borderRadius: "5px",
              backgroundColor: "#eaeaea",
              transition: "background-color 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#ddd")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#eaeaea")}
            role="button"
            tabIndex={0}
            aria-expanded={isUploadSectionOpen}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setIsUploadSectionOpen(!isUploadSectionOpen);
              }
            }}
          >
            <h3
              style={{
                color: "#0078d4",
                fontSize: "1.2em",
                flexGrow: 1,
                margin: 0,
              }}
            >
              Last opp data
            </h3>
            {/* Toggle Icon */}
            <Icon
              iconName={isUploadSectionOpen ? "ChevronDown" : "ChevronRight"}
              styles={{ root: { fontSize: "1em", marginLeft: "10px" } }}
            />
          </div>

          {/* Content to Show/Hide */}
          {isUploadSectionOpen && (
            <div>
              <Label styles={{ root: { fontSize: "0.9em" } }}>
                Last opp data til Blob Storage
              </Label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                style={{ margin: "10px 0", padding: "8px", fontSize: "0.9em" }}
              />
              {selectedFile && (
                <p style={{ fontSize: "0.9em" }}>Valgt fil: {selectedFile.name}</p>
              )}

              <Stack tokens={{ childrenGap: 10 }} horizontal={false}>
                <DefaultButton
                  text="Last opp fil"
                  onClick={uploadFile}
                  style={{
                    backgroundColor: "#0078d4",
                    color: "#fff",
                    fontSize: "0.9em",
                  }}
                />
                <DefaultButton
                  text="Slett filer"
                  onClick={deleteSelectedBlobs}
                  style={{
                    backgroundColor: "#d83b01",
                    color: "#fff",
                    fontSize: "0.9em",
                  }}
                />
                <DefaultButton
                  text="Kjør indekserer"
                  onClick={() => triggerAzureFunction("custom-operation")}
                  style={{
                    backgroundColor: "#107c10",
                    color: "#fff",
                    fontSize: "0.9em",
                  }}
                />
              </Stack>

              {uploadStatus && (
                <MessageBar
                  messageBarType={statusType}
                  style={{ marginTop: "10px", fontSize: "0.9em" }}
                >
                  {uploadStatus}
                </MessageBar>
              )}
            </div>
          )}
        </div>

        {/* File List Section */}
        <div className="fileListSection">
          <h3 style={{ color: "#0078d4", fontSize: "1.2em" }}>
            Filer i Blob Storage
          </h3>
          <SearchBox
            placeholder="Søk i Blob Storage"
            onChange={handleSearch}
            value={searchQuery}
            styles={{ root: { maxWidth: 300 } }}
          />
          <Text variant="medium" styles={{ root: { fontSize: "0.9em" } }}>
            Antall dokumenter: {filteredBlobNames.length}
          </Text>

          <Stack tokens={{ childrenGap: 5 }} style={{ marginTop: "10px" }}>
            {filteredBlobNames.map((name, index) => (
              <div
                key={index}
                style={{
                  padding: "5px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#fff",
                }}
              >
                <Checkbox
                  label={name}
                  onChange={(_, checked) => handleBlobSelection(name, !!checked)}
                  styles={{ root: { fontSize: "0.9em" } }}
                />
              </div>
            ))}
          </Stack>
        </div>
      </div>

      {/* Right-hand side displaying the project description and iframe */}
      <div
        style={{
          flexGrow: 1,
          padding: "0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Project Description Section */}
        <div
          className="projectDescription"
          style={{
            padding: "40px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            borderRadius: "10px",
            marginBottom: "20px",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
            transition: "transform 0.3s",
          }}
        >
          <h1
            style={{
              margin: "0 0 20px 0",
              fontSize: "2em",
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* Example Icon */}
            <Icon
              iconName="Info"
              styles={{ root: { fontSize: "1.5em", marginRight: "10px" } }}
            />
            Kort om prosjektet
          </h1>
          <p style={{ fontSize: "1.1em", lineHeight: "1.6em" }}>
            {/* Your project description goes here */}
            Dette er en litt annerledes versjon av en CV-nettside. Hvor jeg bruker React kode til å kalle på Ressurser i Azure, som blant annet Azure Storage Account og Azure AI Search.
          </p>
        </div>

        {/* Iframe */}
        <div style={{ flexGrow: 1, overflow: "hidden" }}>
          <iframe
            src={`${process.env.PUBLIC_URL}/search.html`}
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Search Interface"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default Ingestion;
