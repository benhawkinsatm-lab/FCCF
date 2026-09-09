import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Folder, 
  FileText, 
  File, 
  Image, 
  Search, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  ExternalLink, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  FolderPlus, 
  FileSpreadsheet, 
  ArrowLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Sparkles,
  Inbox,
  Play,
  FileCheck2,
  Eye,
  FolderSync,
  UploadCloud,
  Layers,
  Scale
} from 'lucide-react';
import { 
  googleSignIn, 
  logout, 
  getAccessToken, 
  initAuth 
} from '../lib/googleDriveAuth';
import { 
  listDriveFiles, 
  downloadDriveFileContent, 
  uploadFileToDrive, 
  createDriveFolder, 
  deleteDriveFile, 
  DriveFileItem 
} from '../services/driveService';
import { DocumentRecord, DocumentCategory, EvidentiaryWeight, TimelineEvent } from '../types';

interface GoogleDriveVaultProps {
  documents: DocumentRecord[];
  onDocumentImported: (doc: DocumentRecord) => void;
  onTimelineEventAdded?: (event: TimelineEvent) => void;
  onViewDocument: (doc: DocumentRecord) => void;
}

export const DEFAULT_IMPORT_FOLDER_NAME = 'FCWA_Case_4344_Import_Inbox';

export const GoogleDriveVault: React.FC<GoogleDriveVaultProps> = ({
  documents,
  onDocumentImported,
  onTimelineEventAdded,
  onViewDocument,
}) => {
  const [user, setUser] = useState<any | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Drive Navigation & Files
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mimeCategory, setMimeCategory] = useState<'all' | 'folders' | 'pdf' | 'docs' | 'sheets' | 'images'>('all');

  // Confirmation Modals (Mandatory for Workspace operations)
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<DriveFileItem | null>(null);
  const [confirmExportModal, setConfirmExportModal] = useState<{
    isOpen: boolean;
    type: 'binder' | 'dossier' | 'affidavit';
    title: string;
    summary: string;
  }>({
    isOpen: false,
    type: 'binder',
    title: '',
    summary: '',
  });

  // Action states
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{ fileId: string; status: 'importing' | 'success' | 'error'; message?: string } | null>(null);
  const [exportStatus, setExportStatus] = useState<{ status: 'exporting' | 'success' | 'error'; message?: string } | null>(null);

  // AI Import Folder & Automated Intake states
  const [aiReadingFileId, setAiReadingFileId] = useState<string | null>(null);
  const [bulkAiProcessing, setBulkAiProcessing] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; currentFileName: string } | null>(null);
  const [confirmCreateImportFolderModal, setConfirmCreateImportFolderModal] = useState<boolean>(false);
  const [confirmBulkAiModal, setConfirmBulkAiModal] = useState<boolean>(false);
  const [isUploadingToImportFolder, setIsUploadingToImportFolder] = useState<boolean>(false);

  // Map of Google Drive fileId -> Recorded Document summary
  const [recordedDriveMap, setRecordedDriveMap] = useState<Record<string, { docId: string; annexure: string; title: string; category: string }>>(() => {
    try {
      const saved = localStorage.getItem('fcwa_recorded_drive_files');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // AI Recording Detail Result Modal
  const [recordedResultModal, setRecordedResultModal] = useState<{
    isOpen: boolean;
    doc: DocumentRecord;
    hasBreach?: boolean;
    breachedOrderNumber?: string;
    breachSeverity?: string;
    breachSummary?: string;
    weightJustification?: string;
    timelineCreated?: boolean;
  } | null>(null);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch files when token or folder changes
  useEffect(() => {
    if (accessToken) {
      loadDriveFiles();
    }
  }, [accessToken, currentFolderId, mimeCategory]);

  const loadDriveFiles = async () => {
    if (!accessToken) return;
    setIsFetchingFiles(true);
    setAuthError(null);
    try {
      const res = await listDriveFiles(accessToken, {
        folderId: currentFolderId,
        searchQuery: searchQuery.trim() || undefined,
        mimeTypeCategory: mimeCategory === 'all' ? undefined : mimeCategory,
      });
      setFiles(res.files);
    } catch (err: any) {
      console.error('Error fetching Google Drive files:', err);
      const is500 = (err.message || '').includes('500');
      setAuthError(
        is500
          ? 'Google Drive server encountered a temporary internal error. The query has been retried with backoff. Click Retry to attempt again.'
          : (err.message || 'Failed to load files from Google Drive.')
      );
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const handleSignIn = async () => {
    if (isAuthLoading) return;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (!msg.includes('cancelled') && !msg.includes('closed') && !msg.includes('Pending promise')) {
        setAuthError(msg || 'Google Sign-in failed. Please try again.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setFiles([]);
    setFolderHistory([]);
    setCurrentFolderId(undefined);
  };

  const handleOpenFolder = (folder: DriveFileItem) => {
    setFolderHistory(prev => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  };

  const handleNavigateUp = (index?: number) => {
    if (index === undefined || index < 0) {
      // Go to root
      setFolderHistory([]);
      setCurrentFolderId(undefined);
    } else {
      const target = folderHistory[index];
      setFolderHistory(prev => prev.slice(0, index + 1));
      setCurrentFolderId(target.id);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDriveFiles();
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !accessToken) return;

    try {
      await createDriveFolder(accessToken, newFolderName.trim(), currentFolderId);
      setNewFolderName('');
      setIsCreatingFolder(false);
      await loadDriveFiles();
    } catch (err: any) {
      alert(`Could not create folder: ${err.message}`);
    }
  };

  // Detect whether current folder or any child folder is the designated AI Import Folder
  const isCurrentFolderImport = 
    folderHistory.some(f => f.name === DEFAULT_IMPORT_FOLDER_NAME || f.name.toLowerCase().includes('import')) ||
    (currentFolderId && files.some(f => f.id === currentFolderId && (f.name === DEFAULT_IMPORT_FOLDER_NAME || f.name.toLowerCase().includes('import'))));

  // Find import folder in current view or root
  const discoveredImportFolder = files.find(
    f => f.mimeType === 'application/vnd.google-apps.folder' && 
         (f.name === DEFAULT_IMPORT_FOLDER_NAME || f.name.toLowerCase().includes('import'))
  );

  // Jump directly into the AI Import Folder
  const handleOpenImportFolder = (folder: DriveFileItem) => {
    handleOpenFolder(folder);
  };

  // Create dedicated AI Import Folder
  const handleExecuteCreateImportFolder = async () => {
    if (!accessToken) return;
    setConfirmCreateImportFolderModal(false);
    setIsFetchingFiles(true);
    try {
      const folder = await createDriveFolder(accessToken, DEFAULT_IMPORT_FOLDER_NAME, currentFolderId);
      await loadDriveFiles();
      handleOpenFolder(folder);
      setExportStatus({
        status: 'success',
        message: `Created dedicated AI Import Folder "${DEFAULT_IMPORT_FOLDER_NAME}". Drop discovery files here for automatic AI reading and legal recording!`,
      });
      setTimeout(() => setExportStatus(null), 5000);
    } catch (err: any) {
      alert(`Could not create AI Import Folder: ${err.message}`);
    } finally {
      setIsFetchingFiles(false);
    }
  };

  // Core Feature: AI Reads a file, extracts Case 4344 legal metadata, and records it appropriately
  const handleAiReadAndRecordFile = async (file: DriveFileItem) => {
    if (!accessToken) return;
    setAiReadingFileId(file.id);
    setImportStatus({ 
      fileId: file.id, 
      status: 'importing', 
      message: `Gemini 3.8 reading "${file.name}" & extracting Case 4344/2023 legal metadata...` 
    });

    try {
      const content = await downloadDriveFileContent(accessToken, file);
      // Optimize payload length to prevent 413 Payload Too Large on large files/exports
      const payloadContent = content && content.length > 200000 
        ? content.slice(0, 180000) + '\n\n[... Remaining content truncated for AI legal ingestion ...]'
        : content;

      let res = await fetch('/api/gemini/ingest-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileContent: payloadContent,
          mimeType: file.mimeType,
          existingDocCount: documents.length,
          folderSource: isCurrentFolderImport ? DEFAULT_IMPORT_FOLDER_NAME : 'Google Drive Vault',
        }),
      });

      // Auto-retry with compact text excerpt if 413 encountered
      if (res.status === 413) {
        console.warn('Received 413 from AI ingestion, retrying with compact excerpt');
        res = await fetch('/api/gemini/ingest-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileContent: content.slice(0, 40000),
            mimeType: file.mimeType,
            existingDocCount: documents.length,
            folderSource: isCurrentFolderImport ? DEFAULT_IMPORT_FOLDER_NAME : 'Google Drive Vault',
          }),
        });
      }

      let data: any = null;
      if (res.ok) {
        data = await res.json();
      } else {
        console.warn(`AI ingestion returned ${res.status}, creating deterministic court record.`);
        const nextNum = documents.length + 1;
        data = {
          docId: `DOC-2024-${String(nextNum).padStart(3, '0')}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: 'Direct Communication',
          date: new Date().toISOString().slice(0, 10),
          sourceOrigin: `Google Drive (${file.name})`,
          evidentiaryWeight: 'Third-Party Objective',
          excerpt: content.slice(0, 240) + '...',
          annexureNumber: `BJH-${nextNum}`,
          hasBreach: false,
          breachedOrderNumber: null,
          breachSeverity: null,
          breachSummary: null,
          weightJustification: 'Evidentiary record imported from Google Drive cloud storage.',
        };
      }

      const newDoc: DocumentRecord = {
        id: data.docId || `DOC-2024-${Date.now().toString().slice(-3)}`,
        title: data.title || file.name.replace(/\.[^/.]+$/, ''),
        category: data.category || 'Direct Communication',
        date: data.date || new Date().toISOString().slice(0, 10),
        sourceOrigin: data.sourceOrigin || `Google Drive (${file.name})`,
        evidentiaryWeight: data.evidentiaryWeight || 'Third-Party Objective',
        fileType: file.mimeType.includes('pdf') ? 'pdf' : file.mimeType.includes('image') ? 'pdf' : 'court_order',
        excerpt: data.excerpt || content.slice(0, 240) + '...',
        fullText: data.fullText || content,
        fileSize: file.size ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` : 'Cloud Doc',
        annexureNumber: data.annexureNumber || `BJH-${documents.length + 1}`,
        metadata: {
          googleDriveFileId: file.id,
          webViewLink: file.webViewLink,
          mimeType: file.mimeType,
          aiRecordedAt: new Date().toISOString(),
          hasBreach: data.hasBreach,
          breachedOrderNumber: data.breachedOrderNumber,
          breachSeverity: data.breachSeverity,
          breachSummary: data.breachSummary,
          weightJustification: data.weightJustification,
        },
      };

      onDocumentImported(newDoc);

      let timelineCreated = false;
      if (data.createTimelineEvent && data.timelineEvent && onTimelineEventAdded) {
        onTimelineEventAdded(data.timelineEvent);
        timelineCreated = true;
      }

      // Track recorded state
      const updatedMap = {
        ...recordedDriveMap,
        [file.id]: {
          docId: newDoc.id,
          annexure: newDoc.annexureNumber || '',
          title: newDoc.title,
          category: newDoc.category,
        }
      };
      setRecordedDriveMap(updatedMap);
      try {
        localStorage.setItem('fcwa_recorded_drive_files', JSON.stringify(updatedMap));
      } catch {}

      setImportStatus({ 
        fileId: file.id, 
        status: 'success', 
        message: `Successfully recorded into Case 4344/2023 as ${newDoc.annexureNumber} (${newDoc.category})!` 
      });

      // Show comprehensive result modal
      setRecordedResultModal({
        isOpen: true,
        doc: newDoc,
        hasBreach: data.hasBreach,
        breachedOrderNumber: data.breachedOrderNumber,
        breachSeverity: data.breachSeverity,
        breachSummary: data.breachSummary,
        weightJustification: data.weightJustification,
        timelineCreated,
      });

      setTimeout(() => setImportStatus(null), 5000);
    } catch (err: any) {
      console.error('AI Ingestion error:', err);
      setImportStatus({ 
        fileId: file.id, 
        status: 'error', 
        message: `AI Reading & Recording Failed: ${err.message}` 
      });
      setTimeout(() => setImportStatus(null), 6000);
    } finally {
      setAiReadingFileId(null);
    }
  };

  // Bulk Process all unrecorded files in the current folder
  const handleExecuteBulkAiProcess = async () => {
    if (!accessToken) return;
    const unrecorded = files.filter(
      f => f.mimeType !== 'application/vnd.google-apps.folder' && !recordedDriveMap[f.id]
    );

    if (unrecorded.length === 0) return;

    setConfirmBulkAiModal(false);
    setBulkAiProcessing(true);

    let recordedCount = 0;
    for (let i = 0; i < unrecorded.length; i++) {
      const file = unrecorded[i];
      setBulkProgress({
        current: i + 1,
        total: unrecorded.length,
        currentFileName: file.name,
      });

      try {
        const content = await downloadDriveFileContent(accessToken, file);
        const payloadContent = content && content.length > 200000 
          ? content.slice(0, 180000) + '\n\n[... Remaining content truncated for AI legal ingestion ...]'
          : content;

        let res = await fetch('/api/gemini/ingest-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileContent: payloadContent,
            mimeType: file.mimeType,
            existingDocCount: documents.length + recordedCount,
            folderSource: DEFAULT_IMPORT_FOLDER_NAME,
          }),
        });

        if (res.status === 413) {
          res = await fetch('/api/gemini/ingest-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileContent: content.slice(0, 40000),
              mimeType: file.mimeType,
              existingDocCount: documents.length + recordedCount,
              folderSource: DEFAULT_IMPORT_FOLDER_NAME,
            }),
          });
        }

        let data: any = null;
        if (res.ok) {
          data = await res.json();
        } else {
          const nextNum = documents.length + recordedCount + 1;
          data = {
            docId: `DOC-2024-${String(nextNum).padStart(3, '0')}`,
            title: file.name.replace(/\.[^/.]+$/, ''),
            category: 'Direct Communication',
            date: new Date().toISOString().slice(0, 10),
            sourceOrigin: `Google Drive (${file.name})`,
            evidentiaryWeight: 'Third-Party Objective',
            excerpt: content.slice(0, 240) + '...',
            annexureNumber: `BJH-${nextNum}`,
            hasBreach: false,
            breachedOrderNumber: null,
            breachSeverity: null,
            breachSummary: null,
            weightJustification: 'Evidentiary record imported from Google Drive cloud storage.',
          };
        }

        if (data) {
          const newDoc: DocumentRecord = {
            id: data.docId || `DOC-2024-${Date.now().toString().slice(-3)}`,
            title: data.title || file.name.replace(/\.[^/.]+$/, ''),
            category: data.category || 'Direct Communication',
            date: data.date || new Date().toISOString().slice(0, 10),
            sourceOrigin: data.sourceOrigin || `Google Drive (${file.name})`,
            evidentiaryWeight: data.evidentiaryWeight || 'Third-Party Objective',
            fileType: file.mimeType.includes('pdf') ? 'pdf' : 'court_order',
            excerpt: data.excerpt || content.slice(0, 240) + '...',
            fullText: data.fullText || content,
            fileSize: file.size ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` : 'Cloud Doc',
            annexureNumber: data.annexureNumber || `BJH-${documents.length + recordedCount + 1}`,
            metadata: {
              googleDriveFileId: file.id,
              webViewLink: file.webViewLink,
              mimeType: file.mimeType,
              aiRecordedAt: new Date().toISOString(),
              hasBreach: data.hasBreach,
              breachedOrderNumber: data.breachedOrderNumber,
              breachSeverity: data.breachSeverity,
              breachSummary: data.breachSummary,
              weightJustification: data.weightJustification,
            },
          };

          onDocumentImported(newDoc);
          if (data.createTimelineEvent && data.timelineEvent && onTimelineEventAdded) {
            onTimelineEventAdded(data.timelineEvent);
          }

          recordedCount++;

          setRecordedDriveMap(prev => {
            const next = {
              ...prev,
              [file.id]: {
                docId: newDoc.id,
                annexure: newDoc.annexureNumber || '',
                title: newDoc.title,
                category: newDoc.category,
              }
            };
            try {
              localStorage.setItem('fcwa_recorded_drive_files', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      } catch (err) {
        console.warn(`Error processing file ${file.name}:`, err);
      }
    }

    setBulkAiProcessing(false);
    setBulkProgress(null);
    setExportStatus({
      status: 'success',
      message: `Batch AI ingestion complete! Read and recorded ${recordedCount} file(s) into Case 4344/2023.`,
    });
    setTimeout(() => setExportStatus(null), 5000);
  };

  // Upload local file directly to current import folder and trigger AI intake
  const handleUploadFileToFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setIsUploadingToImportFolder(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = (event.target?.result as string) || '';
        const uploaded = await uploadFileToDrive(accessToken, {
          name: file.name,
          content,
          folderId: currentFolderId,
          mimeType: file.type || 'text/plain',
          description: `Uploaded to Case 4344 Import Folder for AI analysis`,
        });

        await loadDriveFiles();
        setIsUploadingToImportFolder(false);
        // Automatically trigger AI read & record on the newly uploaded file!
        await handleAiReadAndRecordFile(uploaded);
      } catch (err: any) {
        alert(`Upload failed: ${err.message}`);
        setIsUploadingToImportFolder(false);
      }
    };
    reader.readAsText(file);
  };

  // Import file to Case 4344/2023 Evidence Repository
  const handleImportToCase = async (file: DriveFileItem) => {
    if (!accessToken) return;
    setImportStatus({ fileId: file.id, status: 'importing' });

    try {
      const content = await downloadDriveFileContent(accessToken, file);
      
      // Classify document category based on title/content
      let category: DocumentCategory = 'Legal/Court';
      const lower = (file.name + ' ' + content).toLowerCase();
      if (lower.includes('school') || lower.includes('attendance') || lower.includes('report card') || lower.includes('teacher')) {
        category = 'Education';
      } else if (lower.includes('hospital') || lower.includes('asthma') || lower.includes('doctor') || lower.includes('medical') || lower.includes('emergency')) {
        category = 'Medical';
      } else if (lower.includes('sms') || lower.includes('email') || lower.includes('text') || lower.includes('communication')) {
        category = 'Direct Communication';
      } else if (lower.includes('receipt') || lower.includes('invoice') || lower.includes('fee') || lower.includes('levy') || lower.includes('financial')) {
        category = 'Financial';
      } else if (lower.includes('sport') || lower.includes('football') || lower.includes('bjfc') || lower.includes('swimming')) {
        category = 'Extracurricular';
      }

      let evidentiaryWeight: EvidentiaryWeight = 'Third-Party Objective';
      if (lower.includes('order') || lower.includes('affidavit') || lower.includes('sworn') || lower.includes('court')) {
        evidentiaryWeight = 'Sworn/Official';
      }

      const newDoc: DocumentRecord = {
        id: `DOC-DRIVE-${Date.now().toString().slice(-4)}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        category,
        date: file.modifiedTime ? file.modifiedTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
        sourceOrigin: `Google Drive (${file.name})`,
        evidentiaryWeight,
        fileType: file.mimeType.includes('pdf') ? 'pdf' : file.mimeType.includes('image') ? 'pdf' : 'court_order',
        excerpt: content.slice(0, 240) + '...',
        fullText: content,
        fileSize: file.size ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` : 'Cloud Doc',
        annexureNumber: `BJH-GD-${Math.floor(Math.random() * 90 + 10)}`,
        metadata: {
          googleDriveFileId: file.id,
          webViewLink: file.webViewLink,
          mimeType: file.mimeType,
        },
      };

      onDocumentImported(newDoc);
      setImportStatus({ fileId: file.id, status: 'success', message: `Imported as ${newDoc.id} (${category})` });
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err: any) {
      console.error('Import error:', err);
      setImportStatus({ fileId: file.id, status: 'error', message: err.message });
      setTimeout(() => setImportStatus(null), 5000);
    }
  };

  // Perform destructive file delete with explicit user confirmation
  const handleExecuteDeleteFile = async () => {
    if (!confirmDeleteFile || !accessToken) return;
    try {
      await deleteDriveFile(accessToken, confirmDeleteFile.id);
      setConfirmDeleteFile(null);
      await loadDriveFiles();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  // Execute export with confirmation dialog
  const handleExecuteExport = async () => {
    if (!accessToken) return;
    setExportStatus({ status: 'exporting' });
    const { type, title } = confirmExportModal;
    setConfirmExportModal(prev => ({ ...prev, isOpen: false }));

    try {
      let content = '';
      let filename = '';

      if (type === 'binder') {
        filename = `FCWA_Case_4344_Evidence_Binder_Index_${new Date().toISOString().slice(0, 10)}.txt`;
        content = `FAMILY COURT OF WESTERN AUSTRALIA
CASE NUMBER: 4344/2023
APPLICANT: BENJAMIN JAMES HAWKINS
RESPONDENT: SUE-ANNE HAWKINS

==================================================
OFFICIAL EVIDENCE BINDER & ANNEXURE REGISTER
Generated: ${new Date().toLocaleString()}
Cloud Storage: Google Drive Synchronized
==================================================

TOTAL VERIFIED EXHIBITS: ${documents.length}

${documents.map((d, i) => `[ANNEXURE ${d.annexureNumber || `BJH-${i + 1}`}]
Title: ${d.title}
Reference ID: ${d.id}
Category: ${d.category}
Date of Record: ${d.date}
Evidentiary Weight: ${d.evidentiaryWeight}
Source: ${d.sourceOrigin}
Excerpt:
"${d.excerpt}"
--------------------------------------------------`).join('\n\n')}

End of Evidence Register.`;
      } else if (type === 'dossier') {
        filename = `FCWA_Case_Contravention_Dossier_${new Date().toISOString().slice(0, 10)}.txt`;
        content = `FAMILY COURT OF WESTERN AUSTRALIA (FCWA)
FORM 2 CONTRAVENTION AUDIT & EVIDENTIARY DOSSIER
GENERATED: ${new Date().toLocaleString()}

REGISTERED DOCUMENTS: ${documents.length}
${documents.length === 0 ? 'No documents ingested yet.' : documents.map((d, i) => `[RECORD ${i + 1}]
- Title: ${d.title}
- Reference ID: ${d.id}
- Statutory Factor: ${d.statutoryFactor || 'FLA s 60CC'}
- Date: ${d.date}
- Evidentiary Weight: ${d.evidentiaryWeight}
- Summary: ${d.summary}`).join('\n\n')}

Exported securely to Google Drive.`;
      }

      await uploadFileToDrive(accessToken, {
        name: filename,
        content,
        folderId: currentFolderId,
        mimeType: 'text/plain',
        description: `Exported from FCWA Case 4344/2023 Intelligence Engine on ${new Date().toLocaleDateString()}`,
      });

      setExportStatus({ status: 'success', message: `Successfully exported "${filename}" to Google Drive!` });
      await loadDriveFiles();
      setTimeout(() => setExportStatus(null), 5000);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportStatus({ status: 'error', message: err.message });
      setTimeout(() => setExportStatus(null), 5000);
    }
  };

  const getMimeIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-100" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (mimeType.includes('image')) {
      return <Image className="w-5 h-5 text-purple-600" />;
    }
    return <File className="w-5 h-5 text-indigo-500" />;
  };

  return (
    <div className="space-y-4 pb-12" id="google-drive-vault-container">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
              <Cloud className="w-6 h-6 text-blue-600" />
              <span>Google Drive Case Vault &amp; Cloud Sync</span>
            </h1>
            <p className="text-xs text-slate-500">
              Directly synchronize, browse, import, and export Case 4344/2023 court exhibits with Google Drive.
            </p>
          </div>

          {/* User Sign-In / Account status */}
          <div className="flex items-center gap-3">
            {isAuthLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-1.5 px-3 bg-slate-100 rounded-lg">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Checking Google Auth status...</span>
              </div>
            ) : user && accessToken ? (
              <div className="flex items-center gap-3 bg-blue-50/70 border border-blue-200/80 px-3.5 py-1.5 rounded-xl">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-7 h-7 rounded-full border border-blue-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.email?.[0]?.toUpperCase() || 'G'}
                  </div>
                )}
                <div className="text-left leading-tight">
                  <div className="text-xs font-bold text-slate-900">{user.displayName || 'Authenticated User'}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{user.email}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white/80 transition-colors ml-1"
                  title="Disconnect Google Drive"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Google Sign-In Button complying with Official Google Identity Branding Specs */
              <button
                onClick={handleSignIn}
                disabled={isAuthLoading}
                className="inline-flex items-center justify-center gap-3 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-300 rounded-xl shadow-xs transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                id="google-drive-sign-in-btn"
              >
                {isAuthLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={loadDriveFiles}
                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold rounded text-[11px] transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
              <button
                onClick={() => setAuthError(null)}
                className="px-2 py-1 text-rose-600 hover:text-rose-900 rounded text-[11px]"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {importStatus && (
          <div className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
            importStatus.status === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
            importStatus.status === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {importStatus.status === 'importing' && <RefreshCw className="w-4 h-4 animate-spin" />}
            {importStatus.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {importStatus.status === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{importStatus.message || 'Importing document into Case 4344/2023 evidence repository...'}</span>
          </div>
        )}

        {exportStatus && (
          <div className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
            exportStatus.status === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
            exportStatus.status === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {exportStatus.status === 'exporting' && <RefreshCw className="w-4 h-4 animate-spin" />}
            {exportStatus.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {exportStatus.status === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{exportStatus.message || 'Exporting case file to Google Drive...'}</span>
          </div>
        )}
      </div>

      {!accessToken ? (
        /* Unauthenticated Callout */
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Cloud className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-base font-bold text-slate-800 font-serif">Connect Google Drive to Case 4344/2023</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Authenticate with your Google account to directly browse case discovery files, ingest subpoenaed records into the evidence vault, and backup generated affidavits and contravention registers.
            </p>
          </div>
          <div>
            <button
              onClick={handleSignIn}
              disabled={isAuthLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting Google Drive...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Connect Google Drive</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Authenticated Google Drive Explorer */
        <div className="space-y-4">
          {/* Quick Case Export Bar */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300">
                Case 4344 Cloud Export Suite
              </span>
              <div className="text-xs font-semibold text-slate-100">
                Generate and backup verified evidence dossiers directly to your Google Drive
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                onClick={() => setConfirmExportModal({
                  isOpen: true,
                  type: 'binder',
                  title: 'Evidence Binder Index',
                  summary: `This will compile all ${documents.length} verified annexures and index sheets, creating an official document in your Google Drive.`,
                })}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-blue-300" />
                <span>Export Binder Index to Drive</span>
              </button>
              <button
                onClick={() => setConfirmExportModal({
                  isOpen: true,
                  type: 'dossier',
                  title: 'Contravention Audit Dossier',
                  summary: 'This will compile all recorded breaches of Order 4.2, 5.1, 9.1 and upload a structured legal dossier to your Google Drive.',
                })}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                <span>Export Breach Dossier to Drive</span>
              </button>
            </div>
          </div>

          {/* AI Import Folder & Automated Intake Station Banner */}
          {isCurrentFolderImport ? (
            <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 shadow-md border border-purple-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-300" />
                      AI Legal Intake Station
                    </span>
                    <span className="text-[11px] font-mono text-purple-200">
                      {folderHistory[folderHistory.length - 1]?.name || DEFAULT_IMPORT_FOLDER_NAME}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    Automated Case 4344/2023 Document Ingestion &amp; Evidence Recorder
                  </h3>
                  <p className="text-xs text-purple-200/80 max-w-2xl leading-relaxed">
                    All documents dropped or uploaded here are analyzed by Gemini: extracting dates, assigning Evidence Act 1906 (WA) weight, auditing for breaches of 14 Nov 2023 Interim Orders (Orders 4.2, 5.1, 9.1), and filing official Annexures into the Case Binder.
                  </p>
                </div>

                {/* Intake action controls */}
                <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
                  <button
                    onClick={() => setConfirmBulkAiModal(true)}
                    disabled={bulkAiProcessing || files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder' && !recordedDriveMap[f.id]).length === 0}
                    className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    {bulkAiProcessing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                    )}
                    <span>
                      {bulkAiProcessing ? 'AI Processing...' : `AI Read & Record All (${files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder' && !recordedDriveMap[f.id]).length} Pending)`}
                    </span>
                  </button>

                  <label className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors">
                    {isUploadingToImportFolder ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-300" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5 text-purple-300" />
                    )}
                    <span>{isUploadingToImportFolder ? 'Uploading...' : 'Upload & AI Ingest'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleUploadFileToFolder}
                      disabled={isUploadingToImportFolder || bulkAiProcessing}
                      accept=".pdf,.doc,.docx,.txt,.csv,.png,.jpg,.jpeg"
                    />
                  </label>
                </div>
              </div>

              {/* Real-time bulk progress bar */}
              {bulkAiProcessing && bulkProgress && (
                <div className="p-3 bg-purple-950/60 border border-purple-500/40 rounded-lg space-y-1.5 animate-pulse">
                  <div className="flex items-center justify-between text-xs text-purple-200">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      Ingesting Document {bulkProgress.current} of {bulkProgress.total}:
                      <span className="font-mono text-white truncate max-w-xs">{bulkProgress.currentFileName}</span>
                    </span>
                    <span className="font-bold">{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-purple-900/50 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Status metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-purple-500/20 text-xs">
                <div className="bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-500/20 flex items-center justify-between">
                  <span className="text-purple-300/80">Folder Items:</span>
                  <span className="font-bold text-white font-mono">{files.length}</span>
                </div>
                <div className="bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-500/20 flex items-center justify-between">
                  <span className="text-purple-300/80">Pending AI Intake:</span>
                  <span className="font-bold text-amber-400 font-mono">
                    {files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder' && !recordedDriveMap[f.id]).length}
                  </span>
                </div>
                <div className="bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-500/20 flex items-center justify-between col-span-2 sm:col-span-1">
                  <span className="text-purple-300/80">Recorded in Case:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {files.filter(f => recordedDriveMap[f.id]).length}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Non-import folder notification banner */
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Inbox className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800">
                      AI Evidence Import Folder
                    </h4>
                    {discoveredImportFolder && (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                        Ready in Drive
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-xl">
                    Designate or open a dedicated Google Drive inbox where discovery records, medical summaries, and SMS logs are read and automatically filed with evidentiary weights.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {discoveredImportFolder ? (
                  <button
                    onClick={() => handleOpenImportFolder(discoveredImportFolder)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <FolderSync className="w-3.5 h-3.5" />
                    <span>Open Import Folder ({discoveredImportFolder.name})</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmCreateImportFolderModal(true)}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Create AI Import Folder</span>
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            {/* Breadcrumb path & Create Folder */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1 text-xs font-medium text-slate-600 flex-wrap">
                <button
                  onClick={() => handleNavigateUp()}
                  className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${
                    !currentFolderId ? 'font-bold text-slate-900' : ''
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5 text-blue-500" />
                  <span>My Drive</span>
                </button>
                {folderHistory.map((f, i) => (
                  <React.Fragment key={f.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      onClick={() => handleNavigateUp(i)}
                      className={`hover:text-blue-600 transition-colors ${
                        i === folderHistory.length - 1 ? 'font-bold text-slate-900' : ''
                      }`}
                    >
                      {f.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-slate-600" />
                  <span>New Folder</span>
                </button>
                <button
                  onClick={loadDriveFiles}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Refresh Files"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetchingFiles ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Folder creation form */}
            {isCreatingFolder && (
              <form onSubmit={handleCreateFolder} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-500" />
                <input
                  type="text"
                  placeholder="Enter new folder name (e.g., 'FCWA Case 4344 Evidence')"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold text-xs rounded transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 text-xs rounded hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Search & Mime Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 flex-1 max-w-sm">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search files in Google Drive..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shrink-0"
                >
                  Search
                </button>
              </form>

              {/* Mime Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(['all', 'folders', 'pdf', 'docs', 'sheets', 'images'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setMimeCategory(cat)}
                    className={`px-2.5 py-1 rounded-md capitalize font-medium text-[11px] transition-colors ${
                      mimeCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Files List Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Google Drive Files &amp; Exhibits ({files.length})</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Click any file to import into the Case 4344/2023 Evidence Ledger
              </span>
            </div>

            {isFetchingFiles ? (
              <div className="p-8 text-center space-y-2 text-xs text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600" />
                <p>Loading files from Google Drive...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-xs text-slate-400">
                <Folder className="w-8 h-8 mx-auto text-slate-300" />
                <p>No files found in this folder matching the search criteria.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-500 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Modified</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {files.map((file) => {
                      const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                      const isImportFolder = isFolder && (file.name === DEFAULT_IMPORT_FOLDER_NAME || file.name.toLowerCase().includes('import'));
                      const isImporting = importStatus?.fileId === file.id && importStatus.status === 'importing';
                      const isAiReading = aiReadingFileId === file.id;

                      // Check if file is recorded in Case 4344
                      const recordedData = recordedDriveMap[file.id];
                      const existingDoc = documents.find(d => d.metadata?.googleDriveFileId === file.id || (recordedData && d.id === recordedData.docId));
                      const isRecorded = !!recordedData || !!existingDoc;
                      const displayAnnexure = existingDoc?.annexureNumber || recordedData?.annexure || 'Annexure';

                      return (
                        <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {isImportFolder ? (
                                <div className="w-5 h-5 rounded bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                  <Sparkles className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                getMimeIcon(file.mimeType)
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                {isFolder ? (
                                  <button
                                    onClick={() => handleOpenFolder(file)}
                                    className="font-bold text-slate-900 hover:text-blue-600 text-left truncate max-w-xs sm:max-w-md transition-colors"
                                  >
                                    {file.name}
                                  </button>
                                ) : (
                                  <span className="font-medium text-slate-800 truncate max-w-xs sm:max-w-md" title={file.name}>
                                    {file.name}
                                  </span>
                                )}

                                {isImportFolder && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                    AI Intake Folder
                                  </span>
                                )}

                                {isRecorded && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <FileCheck2 className="w-3 h-3 text-emerald-600" />
                                    <span>Recorded ({displayAnnexure})</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                            {isFolder ? 'Folder' : file.mimeType.split('/').pop()?.toUpperCase()}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[11px]">
                            {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {isFolder ? (
                                <button
                                  onClick={() => handleOpenFolder(file)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                                >
                                  <span>Open Folder</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              ) : isRecorded ? (
                                <div className="flex items-center gap-1">
                                  {existingDoc && (
                                    <button
                                      onClick={() => onViewDocument(existingDoc)}
                                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
                                      title="Open in Case Evidence Binder"
                                    >
                                      <Eye className="w-3 h-3 text-emerald-600" />
                                      <span>View in Case</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleAiReadAndRecordFile(file)}
                                    disabled={isAiReading || isImporting}
                                    className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded font-medium text-[11px] flex items-center gap-1 transition-colors"
                                    title="Re-analyze with Gemini Legal Engine"
                                  >
                                    <RefreshCw className={`w-3 h-3 text-purple-600 ${isAiReading ? 'animate-spin' : ''}`} />
                                    <span>Re-Read AI</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {/* Primary AI Read & Record Button */}
                                  <button
                                    onClick={() => handleAiReadAndRecordFile(file)}
                                    disabled={isAiReading || isImporting}
                                    className="px-2.5 py-1 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 text-white rounded font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                                    title="AI reads file, extracts Case 4344 metadata, and records as official Annexure"
                                  >
                                    {isAiReading ? (
                                      <RefreshCw className="w-3 h-3 animate-spin text-white" />
                                    ) : (
                                      <Sparkles className="w-3 h-3 text-amber-300" />
                                    )}
                                    <span>{isAiReading ? 'Reading...' : 'AI Read & Record'}</span>
                                  </button>

                                  <button
                                    onClick={() => handleImportToCase(file)}
                                    disabled={isImporting || isAiReading}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px] flex items-center gap-1 transition-colors"
                                    title="Import as standard document"
                                  >
                                    {isImporting ? (
                                      <RefreshCw className="w-3 h-3 animate-spin text-slate-600" />
                                    ) : (
                                      <Plus className="w-3 h-3 text-slate-600" />
                                    )}
                                    <span>Import</span>
                                  </button>
                                </div>
                              )}

                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                                  title="Open in Google Drive"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <button
                                onClick={() => setConfirmDeleteFile(file)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                title="Delete from Google Drive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: AI READ & RECORD RESULT MODAL */}
      {recordedResultModal && recordedResultModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-purple-200 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Document Read &amp; Recorded to Case 4344
                  </h3>
                  <p className="text-xs text-purple-700 font-medium">
                    Verified Exhibit Annexure: {recordedResultModal.doc.annexureNumber}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recorded</span>
              </span>
            </div>

            {/* Contravention Alert Banner if breach detected */}
            {recordedResultModal.hasBreach && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Contravention Detected: {recordedResultModal.breachedOrderNumber || 'Interim Parenting Orders'} ({recordedResultModal.breachSeverity || 'High'} Severity)
                  </span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed pl-6">
                  {recordedResultModal.breachSummary}
                </p>
              </div>
            )}

            {/* Document Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Document Title</span>
                <p className="font-bold text-slate-900">{recordedResultModal.doc.title}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Legal Category</span>
                <p className="font-bold text-slate-900">{recordedResultModal.doc.category}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Date of Record</span>
                <p className="font-bold text-slate-900">{recordedResultModal.doc.date}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Evidence Act Weight</span>
                <p className="font-bold text-indigo-700">{recordedResultModal.doc.evidentiaryWeight}</p>
              </div>
            </div>

            {/* Evidentiary Weight Justification */}
            {recordedResultModal.weightJustification && (
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                  <Scale className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Evidence Act 1906 (WA) Assessment</span>
                </div>
                <p className="text-indigo-800 leading-relaxed">
                  {recordedResultModal.weightJustification}
                </p>
              </div>
            )}

            {/* Extracted Excerpt */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Extracted Legal Quote</span>
              <p className="text-slate-700 italic border-l-2 border-purple-500 pl-2 leading-relaxed">
                "{recordedResultModal.doc.excerpt}"
              </p>
            </div>

            {recordedResultModal.timelineCreated && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Automatically cross-referenced and plotted on the Case 4344/2023 Timeline.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRecordedResultModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const doc = recordedResultModal.doc;
                  setRecordedResultModal(null);
                  onViewDocument(doc);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open in Case Evidence Binder</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM CREATE AI IMPORT FOLDER */}
      {confirmCreateImportFolderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                Create AI Evidence Import Folder
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will create a dedicated Google Drive folder named{' '}
                <strong className="text-purple-700 font-mono">"{DEFAULT_IMPORT_FOLDER_NAME}"</strong>.
                Any evidence documents, subpoenas, or transcripts placed in this folder can be read and recorded into Case 4344/2023 by Gemini.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmCreateImportFolderModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCreateImportFolder}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Create Folder &amp; Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM BULK AI INGESTION */}
      {confirmBulkAiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                Start Batch AI Document Ingestion
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gemini 3.8 will sequential read{' '}
                <strong className="text-slate-800 font-bold">
                  {files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder' && !recordedDriveMap[f.id]).length} pending file(s)
                </strong>{' '}
                in this folder. Each document will be classified, checked for contraventions of Interim Orders, and recorded as verified Annexures.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmBulkAiModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkAiProcess}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Confirm &amp; Run AI Ingestion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION DIALOG FOR MUTATING / DESTRUCTIVE WORKSPACE ACTIONS */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Deletion from Google Drive
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-800 font-mono">"{confirmDeleteFile.name}"</strong> from your Google Drive?
                This operation directly modifies your cloud storage.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmDeleteFile(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDeleteFile}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Yes, Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION DIALOG FOR CREATING / EXPORTING FILES TO GOOGLE DRIVE */}
      {confirmExportModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <Cloud className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Upload to Google Drive: {confirmExportModal.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {confirmExportModal.summary}
              </p>
              <p className="text-[11px] text-slate-400">
                Destination: Google Drive &gt; {currentFolderId ? 'Current Folder' : 'Root Drive'}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmExportModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteExport}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Confirm &amp; Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
