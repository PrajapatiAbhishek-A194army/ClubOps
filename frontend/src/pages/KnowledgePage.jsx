import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  FileText,
  Upload,
  Sparkles,
  Quote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { searchKnowledge, getClubDocuments, uploadDocument } from '../services/api';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function KnowledgePage() {
  const { activeClub, activeRole } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const isManagement = ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(activeRole);

  const fetchDocs = async () => {
    if (!activeClub?.id) return;
    try {
      setLoading(true);
      const res = await getClubDocuments(activeClub.id);
      if (res.success) {
        setDocuments(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [activeClub?.id]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError(null);
    try {
      const res = await searchKnowledge(activeClub.id, query.trim());
      if (res.success) {
        setSearchResult(res.data);
      }
    } catch (err) {
      setError('Knowledge query failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadName.trim() || !uploadContent.trim()) return;

    setUploading(true);
    try {
      const res = await uploadDocument(activeClub.id, {
        name: uploadName.trim(),
        file_path: `/storage/documents/${uploadName.trim()}`,
        file_type: 'text/plain',
        text_content: uploadContent.trim(),
      });
      if (res.success) {
        setUploadSuccess('Document indexed successfully!');
        setIsUploadOpen(false);
        setUploadName('');
        setUploadContent('');
        fetchDocs();
      }
    } catch (err) {
      setError('Document upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const sampleQuestions = [
    'What permissions are needed for auditorium technical workshops?',
    'What are the campus wifi hotspot reservation procedures?',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Institutional Memory
            </span>
            <span className="text-xs text-slate-500">RAG Document Repository</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            Club Knowledge Repository & Semantic RAG
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Search past event reports, committee guidelines, and campus operating procedures. Answers cite exact source documents.
          </p>
        </div>

        {isManagement && (
          <Button
            variant="primary"
            onClick={() => setIsUploadOpen(true)}
            leftIcon={Upload}
          >
            Upload Document
          </Button>
        )}
      </div>

      {uploadSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{uploadSuccess}</span>
          </div>
          <button onClick={() => setUploadSuccess(null)} className="text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* Search Input Box */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-6 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask ClubOps institutional memory: e.g. 'What permissions are required for auditorium workshops?'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full text-sm pl-11 pr-28 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs text-slate-900 placeholder-slate-400 focus:outline-emerald-600"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <div className="absolute right-2 top-2">
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={searching || !query.trim()}
                  leftIcon={searching ? Loader2 : Sparkles}
                >
                  {searching ? 'Synthesizing...' : 'Search'}
                </Button>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Try asking:</span>
              {sampleQuestions.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuery(q);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Answer & Citations Card */}
      {searchResult && (
        <Card className="border-emerald-200 bg-emerald-50/20 shadow-sm animate-in fade-in slide-in-from-top-3">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>AI Synthesized Answer</span>
            </div>

            <p className="text-sm text-slate-800 font-medium leading-relaxed">
              {searchResult.answer}
            </p>

            {/* Citations */}
            {searchResult.citations?.length > 0 && (
              <div className="pt-4 border-t border-emerald-100 space-y-2">
                <span className="text-xs font-bold text-slate-600">Source Citations:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {searchResult.citations.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-emerald-200/80 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold truncate">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{c.document_name}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] italic line-clamp-2">
                        "{c.snippet}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Library */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800">
          Indexed Documents ({documents.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 bg-white border border-slate-200 rounded-xl flex items-start gap-3 hover:border-emerald-300 transition-colors shadow-2xs"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs text-slate-900 truncate">{doc.name}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {doc.chunk_count} chunks indexed
                </p>
                <span className="text-[10px] text-slate-400">
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Institutional Document"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <Input
            label="Document Name"
            placeholder="e.g. Auditorium_SOP_2026.pdf"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Document Text Content</label>
            <Textarea
              rows={6}
              placeholder="Paste document text or operating procedures to index for RAG..."
              value={uploadContent}
              onChange={(e) => setUploadContent(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={uploading}
              leftIcon={uploading ? Loader2 : Upload}
            >
              {uploading ? 'Indexing...' : 'Upload & Index'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
