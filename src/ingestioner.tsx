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

// Tror dette er starten på komponenten min
const Ingestion = () => {
  const clientId = "xxx"; // Azure AD klient-ID, må nok få tak i den riktige her
  const tenantId = "xxx"; // Leietaker-ID, må også endres til riktig
  const blobStorageUrl = "https://xxxx.blob.core.windows.net/"; // Blob Storage URL, må dobbeltsjekke denne

  // Prøver å sette opp noen state-variabler her
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

  // Funksjon for når filen endres, håper dette fungerer
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Sjekker om det er valgt en fil
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]); // Setter den valgte filen
    }
  };

  // Funksjon for å håndtere valg av blob-filer
  const handleBlobSelection = (blobName: string, isSelected: boolean) => {
    // Oppdaterer listen over valgte blobs
    setSelectedBlobs((prev) =>
      isSelected ? [...prev, blobName] : prev.filter((name) => name !== blobName)
    );
  };

  // Funksjon for å hente navnene på blob-filene fra Azure, usikker på om denne er riktig
  const fetchBlobNames = async (blobServiceClient: BlobServiceClient) => {
    try {
      const containerClient = blobServiceClient.getContainerClient("content");
      const blobs = containerClient.listBlobsFlat();
      const blobList: string[] = [];
      // Går gjennom alle blobs og legger dem til i listen
      for await (const blob of blobs) {
        blobList.push(blob.name); // Legger til blob-navnet i listen
      }
      setBlobNames(blobList); // Oppdaterer state med blob-navnene
      setFilteredBlobNames(blobList); // Initialiserer filtrert liste
    } catch (error) {
      // Viser feilmelding hvis noe går galt
      setUploadStatus(`Failed to fetch blob names: ${(error as Error).message}`);
      setStatusType(MessageBarType.error);
    }
  };

  // Funksjon for å trigge Azure-funksjonen, håper jeg har skrevet denne riktig
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

      setUploadStatus("Indeksering vellykket!"); // Viser suksessmelding
      setStatusType(MessageBarType.success);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setUploadStatus(`Indeksering feilet: ${errorMessage}`); // Viser feilmelding
      setStatusType(MessageBarType.error);
    }
  };

  // Funksjon for å laste opp fil til Blob Storage
  const uploadFile = async () => {
    if (!selectedFile) {
      setUploadStatus("Velg fil først."); // Ber brukeren velge en fil
      setStatusType(MessageBarType.warning);
      return;
    }

    setUploadStatus("Laster opp..."); // Viser at opplasting pågår
    setStatusType(MessageBarType.info);

    try {
      // Prøver å koble til Azure, håper dette fungerer
      const credential = new InteractiveBrowserCredential({
        clientId,
        tenantId,
        redirectUri: window.location.origin,
      });

      const blobServiceClient = new BlobServiceClient(blobStorageUrl, credential);
      const containerClient = blobServiceClient.getContainerClient("content");
      const blobClient = containerClient.getBlockBlobClient(selectedFile.name);

      await blobClient.uploadData(selectedFile); // Laster opp filen

      setUploadStatus("Data er lastet opp!"); // Viser at opplastingen var vellykket
      setStatusType(MessageBarType.success);
      fetchBlobNames(blobServiceClient); // Oppdaterer blob-listen
    } catch (error) {
      // Viser feilmelding hvis opplastingen feiler
      setUploadStatus(`Opplasting feilet: ${(error as Error).message}`);
      setStatusType(MessageBarType.error);
    }
  };

  // Funksjon for å slette valgte blobs
  const deleteSelectedBlobs = async () => {
    if (selectedBlobs.length === 0) {
      setUploadStatus("Velg filer å slette."); // Ber brukeren velge filer å slette
      setStatusType(MessageBarType.warning);
      return;
    }

    try {
      // Kobler til Azure for å slette filer
      const credential = new InteractiveBrowserCredential({
        clientId,
        tenantId,
        redirectUri: window.location.origin,
      });

      const blobServiceClient = new BlobServiceClient(blobStorageUrl, credential);
      const containerClient = blobServiceClient.getContainerClient("content");

      // Går gjennom alle valgte blobs og sletter dem
      for (const blobName of selectedBlobs) {
        const blobClient = containerClient.getBlobClient(blobName);
        await blobClient.delete();
      }

      setUploadStatus("Filer er nå slettet!"); // Viser at slettingen var vellykket
      setStatusType(MessageBarType.success);
      fetchBlobNames(blobServiceClient); // Oppdaterer blob-listen
      setSelectedBlobs([]); // Tømmer listen over valgte blobs
    } catch (error) {
      // Viser feilmelding hvis noe går galt under sletting
      setUploadStatus(`Feil ved sletting: ${(error as Error).message}`);
      setStatusType(MessageBarType.error);
    }
  };

  // Funksjon for å håndtere søk i blob-listen
  const handleSearch = (event: any, newValue?: string) => {
    const query = newValue || "";
    setSearchQuery(query);

    if (query) {
      // Filtrerer blob-navnene basert på søket
      const filtered = blobNames.filter((name) =>
        name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredBlobNames(filtered); // Oppdaterer filtrert liste
    } else {
      setFilteredBlobNames(blobNames); // Viser alle hvis søkefeltet er tomt
    }
  };

  // useEffect for å initialisere Blob-klienten når komponenten laster inn
  useEffect(() => {
    const initializeBlobClient = async () => {
      // Prøver å koble til Azure, håper jeg har gjort dette riktig
      const credential = new InteractiveBrowserCredential({
        clientId,
        tenantId,
        redirectUri: window.location.origin,
      });
      const blobServiceClient = new BlobServiceClient(blobStorageUrl, credential);
      await fetchBlobNames(blobServiceClient); // Henter blob-navnene
    };
    initializeBlobClient(); // Kaller funksjonen
  }, []);

  // Returnerer JSX for komponenten
  return (
    <div style={{ display: "flex", gap: "20px", height: "100vh" }}>
      {/* Sidebar for Blob Storage liste og kontroller */}
      <div
        className="sidebar"
        style={{
          width: "300px",
          padding: "20px",
          backgroundColor: "#f7f7f7",
          overflowY: "auto",
        }}
      >
        {/* Profilseksjon */}
        <div
          className="profileSection"
          style={{ marginBottom: "20px", textAlign: "center" }}
        >
          {/* Tror jeg må bytte ut "Navn" med mitt eget navn */}
          <h2>Navn</h2>
          {/* Her skal jeg legge inn bildet mitt */}
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
          <p>Litt tekst her</p> {/* Kanskje skrive noe om meg selv */}
        </div>

        {/* Opplastingsseksjon */}
        <div className="uploadSection" style={{ marginBottom: "20px" }}>
          {/* Klikkbar overskrift for å vise/skjule opplastingsseksjonen */}
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
                color: "#222222",
                fontSize: "1.2em",
                flexGrow: 1,
                margin: 0,
              }}
            >
              Last opp data
            </h3>
            {/* Ikon som endrer seg når seksjonen er åpen/lukket */}
            <Icon
              iconName={isUploadSectionOpen ? "ChevronDown" : "ChevronRight"}
              styles={{ root: { fontSize: "1em", marginLeft: "10px" } }}
            />
          </div>

          {/* Innhold som vises når opplastingsseksjonen er åpen */}
          {isUploadSectionOpen && (
            <div>
              <Label styles={{ root: { fontSize: "0.9em" } }}>
                Last opp data til Blob Storage
              </Label>
              {/* Input for å velge fil */}
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
                {/* Knapp for å laste opp filen */}
                <DefaultButton
                  text="Last opp fil"
                  onClick={uploadFile}
                  style={{
                    backgroundColor: "#a9a9a9",
                    color: "#fff",
                    fontSize: "0.9em",
                  }}
                />
                {/* Knapp for å slette valgte filer */}
                <DefaultButton
                  text="Slett filer"
                  onClick={deleteSelectedBlobs}
                  style={{
                    backgroundColor: "#a9a9a9",
                    color: "#fff",
                    fontSize: "0.9em",
                  }}
                />
                {/* Knapp for å kjøre indekserer */}
                <DefaultButton
                  text="Kjør indekserer"
                  onClick={() => triggerAzureFunction("custom-operation")}
                  style={{
                    backgroundColor: "#a9a9a9",
                    color: "#fff",
                    fontSize: "0.9em",
                  }}
                />
              </Stack>

              {/* Viser statusmelding etter opplasting/sletting */}
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

        {/* Fil-liste seksjon */}
        <div className="fileListSection">
          <h3 style={{ color: "#222222", fontSize: "1.2em" }}>
            Filer i Blob Storage
          </h3>
          {/* Søkeboks for å søke etter filer */}
          <SearchBox
            placeholder="Søk i Blob Storage"
            onChange={handleSearch}
            value={searchQuery}
            styles={{ root: { maxWidth: 300 } }}
          />
          {/* Viser hvor mange dokumenter som er funnet */}
          <Text variant="medium" styles={{ root: { fontSize: "0.9em" } }}>
            Antall dokumenter: {filteredBlobNames.length}
          </Text>

          {/* Liste over filer med mulighet for å velge dem */}
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

      {/* Høyre side som viser prosjektbeskrivelse og iframe */}
      <div
        style={{
          flexGrow: 1,
          padding: "0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Prosjektbeskrivelse seksjon */}
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
            {/* Eksempelikon */}
            <Icon
              iconName="Info"
              styles={{ root: { fontSize: "1.5em", marginRight: "10px" } }}
            />
            Kort om prosjektet
          </h1>
          <p style={{ fontSize: "1.1em", lineHeight: "1.6em" }}>
            {/* Her kan jeg skrive om prosjektet mitt */}
            Dette er en litt annerledes versjon av en CV-nettside, hvor jeg bruker React-kode til å koble til ressurser i Azure, som blant annet Azure Storage Account og Azure AI Search.
          </p>
        </div>

        {/* Iframe som viser søkegrensesnittet */}
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
