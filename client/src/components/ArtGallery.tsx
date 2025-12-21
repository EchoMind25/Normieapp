import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { normalizeStorageUrl } from "@/lib/utils";
import { isNative, pickOrTakePhoto, dataUrlToFile } from "@/lib/native-utils";
import { 
  Image, 
  Upload, 
  ThumbsUp, 
  ThumbsDown, 
  Eye, 
  MessageSquare, 
  Star, 
  Send,
  Loader2,
  Sparkles,
  Grid3X3,
  Trophy,
  LogIn,
  User,
  Camera,
  X
} from "lucide-react";
import type { GalleryItem, GalleryCommentWithAvatar } from "@shared/schema";

function getVisitorId(): string {
  let visitorId = localStorage.getItem("normie_visitor_id");
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("normie_visitor_id", visitorId);
  }
  return visitorId;
}

interface GalleryCardProps {
  item: GalleryItem;
  onVote: (id: string, voteType: "up" | "down") => void;
  onViewDetails: (item: GalleryItem) => void;
}

function GalleryCard({ item, onVote, onViewDetails }: GalleryCardProps) {
  const score = (item.upvotes || 0) - (item.downvotes || 0);
  const scoreColor = score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-muted-foreground";
  
  return (
    <Card 
      className="overflow-hidden hover-elevate cursor-pointer group card-press"
      onClick={() => onViewDetails(item)}
      data-testid={`card-gallery-${item.id}`}
    >
      <div className="aspect-square relative overflow-hidden bg-muted">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {item.featured && (
          <Badge className="absolute top-2 right-2 bg-yellow-500/90">
            <Star className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="font-mono font-semibold text-sm truncate mb-1" data-testid={`text-gallery-title-${item.id}`}>
          {item.title}
        </h3>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-mono truncate">
            {item.creatorName || "Anonymous"}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {item.views || 0}
            </span>
            <span className={`flex items-center gap-1 font-bold ${scoreColor}`}>
              {score > 0 ? "+" : ""}{score}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-7 text-xs"
            onClick={() => onVote(item.id, "up")}
            data-testid={`button-upvote-${item.id}`}
          >
            <ThumbsUp className="w-3 h-3 mr-1" />
            {item.upvotes || 0}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-7 text-xs"
            onClick={() => onVote(item.id, "down")}
            data-testid={`button-downvote-${item.id}`}
          >
            <ThumbsDown className="w-3 h-3 mr-1" />
            {item.downvotes || 0}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface UploadFormProps {
  onSuccess: () => void;
}

function UploadForm({ onSuccess }: UploadFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [tags, setTags] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; imageUrl: string; creatorName: string; tags: string[] }) => {
      return apiRequest("POST", "/api/gallery", data);
    },
    onSuccess: () => {
      toast({ title: "Artwork Submitted", description: "Your artwork has been submitted for review." });
      setTitle("");
      setDescription("");
      setImageUrl("");
      setCreatorName("");
      setTags("");
      setSelectedFile(null);
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit artwork.", variant: "destructive" });
    },
  });

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png", 
    "image/svg+xml",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleNativeImagePick = async () => {
    try {
      const photo = await pickOrTakePhoto();
      if (photo && photo.dataUrl) {
        const file = dataUrlToFile(photo.dataUrl, `photo_${Date.now()}.${photo.format || 'jpeg'}`);
        setSelectedFile(file);
        setPreviewUrl(photo.dataUrl);
        setImageUrl("");
      }
    } catch (e: any) {
      toast({ 
        title: "Error", 
        description: e.message || "Could not access camera or photos. Please check app permissions.", 
        variant: "destructive" 
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type - also accept files without type (some mobile browsers)
      if (file.type && !ALLOWED_TYPES.includes(file.type)) {
        // Check by extension as fallback for mobile
        const ext = file.name.toLowerCase().split('.').pop();
        const allowedExts = ['jpg', 'jpeg', 'png', 'svg', 'webp', 'heic', 'heif'];
        if (!ext || !allowedExts.includes(ext)) {
          toast({ title: "Error", description: "Supported formats: JPG, PNG, SVG, WEBP, HEIC", variant: "destructive" });
          return;
        }
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "Error", description: "File size must be under 10MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setImageUrl("");
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast({ title: "Error", description: "Title is required.", variant: "destructive" });
      return;
    }
    if (!selectedFile && !imageUrl) {
      toast({ title: "Error", description: "Please upload an image or provide a URL.", variant: "destructive" });
      return;
    }

    let finalImageUrl = imageUrl;

    if (selectedFile) {
      try {
        const result = await uploadFile(selectedFile);
        if (!result) {
          throw new Error("Upload failed");
        }
        finalImageUrl = result.objectPath;
      } catch (error: any) {
        toast({ title: "Upload Error", description: error.message || "Failed to upload image.", variant: "destructive" });
        return;
      }
    }

    uploadMutation.mutate({
      title,
      description,
      imageUrl: finalImageUrl,
      creatorName: creatorName || "Anonymous",
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    });
  };

  const isPending = uploadMutation.isPending || isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter artwork title"
          className="font-mono"
          data-testid="input-gallery-title"
        />
      </div>
      <div>
        <Label htmlFor="imageFile">Upload Image *</Label>
        {isNative ? (
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full font-mono"
              onClick={handleNativeImagePick}
              data-testid="button-native-image-pick"
            >
              <Camera className="w-4 h-4 mr-2" />
              {selectedFile ? "Change Image" : "Take Photo or Choose from Gallery"}
            </Button>
            {previewUrl && selectedFile && (
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full max-h-48 object-contain rounded-md border border-border"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearFile}
                  className="absolute top-1 right-1 h-6 w-6 bg-background/80"
                  data-testid="button-clear-image"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Input
              id="imageFile"
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.svg,.webp,.heic,.heif"
              capture="environment"
              onChange={handleFileChange}
              className="font-mono cursor-pointer"
              data-testid="input-gallery-file"
            />
            {selectedFile && previewUrl && (
              <div className="mt-2 space-y-1">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full max-h-32 object-contain rounded-md border border-border"
                />
                <div className="flex items-center gap-2">
                  <p className="text-xs text-primary flex-1 truncate">
                    {selectedFile.name}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                    className="h-6 px-2 text-xs"
                    data-testid="button-clear-file"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG, SVG, WEBP, or HEIC - max 10MB
        </p>
      </div>
      {!selectedFile && (
        <>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div>
            <Label htmlFor="imageUrl">Image URL (optional)</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              className="font-mono"
              data-testid="input-gallery-image-url"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Paste a direct link if you can't upload
            </p>
          </div>
        </>
      )}
      <div>
        <Label htmlFor="creatorName">Your Name</Label>
        <Input
          id="creatorName"
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
          placeholder="Anonymous"
          className="font-mono"
          data-testid="input-gallery-creator"
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us about your creation..."
          className="font-mono resize-none"
          rows={3}
          data-testid="input-gallery-description"
        />
      </div>
      <div>
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="meme, normie, funny"
          className="font-mono"
          data-testid="input-gallery-tags"
        />
      </div>
      <Button 
        type="submit" 
        className="w-full" 
        disabled={isPending}
        data-testid="button-submit-gallery"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {isUploading ? "Uploading..." : "Submit Artwork"}
      </Button>
    </form>
  );
}

interface ItemDetailsProps {
  item: GalleryItem;
  onClose: () => void;
  onVote: (id: string, voteType: "up" | "down") => void;
}

function ItemDetails({ item, onClose, onVote }: ItemDetailsProps) {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const hasTrackedView = useRef(false);

  // Track view once per session
  useEffect(() => {
    if (hasTrackedView.current) return;
    
    const viewedKey = `gallery_viewed_${item.id}`;
    const alreadyViewed = sessionStorage.getItem(viewedKey);
    
    if (!alreadyViewed) {
      // Mark as viewed in session and call API
      sessionStorage.setItem(viewedKey, "1");
      fetch(`/api/gallery/${item.id}`).catch(() => {});
    }
    hasTrackedView.current = true;
  }, [item.id]);

  // Use passed item directly (no extra fetch needed)
  const displayItem = item;

  const { data: comments = [], refetch: refetchComments } = useQuery<GalleryCommentWithAvatar[]>({
    queryKey: ["/api/gallery", item.id, "comments"],
  });

  const commentMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      return apiRequest("POST", `/api/gallery/${item.id}/comments`, data);
    },
    onSuccess: () => {
      setNewComment("");
      refetchComments();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post comment. Please sign in first.", variant: "destructive" });
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated) return;
    commentMutation.mutate({
      content: newComment,
    });
  };

  const score = (displayItem.upvotes || 0) - (displayItem.downvotes || 0);

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <div className="relative">
        <img
          src={displayItem.imageUrl}
          alt={displayItem.title}
          className="w-full max-h-[50vh] object-contain bg-black/50 rounded-lg"
        />
        {displayItem.featured && (
          <Badge className="absolute top-2 right-2 bg-yellow-500/90">
            <Star className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        )}
      </div>
      
      <div className="mt-4 space-y-4">
        <div>
          <h2 className="text-xl font-mono font-bold">{displayItem.title}</h2>
          <p className="text-sm text-muted-foreground font-mono">
            by {displayItem.creatorName || "Anonymous"}
          </p>
        </div>
        
        {displayItem.description && (
          <p className="text-sm text-muted-foreground">{displayItem.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {displayItem.views || 0} views
          </span>
          <span className="font-bold">
            Score: {score > 0 ? "+" : ""}{score}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onVote(displayItem.id, "up")}
            data-testid={`button-detail-upvote-${displayItem.id}`}
          >
            <ThumbsUp className="w-4 h-4 mr-2 text-green-400" />
            Upvote ({displayItem.upvotes || 0})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onVote(displayItem.id, "down")}
            data-testid={`button-detail-downvote-${displayItem.id}`}
          >
            <ThumbsDown className="w-4 h-4 mr-2 text-red-400" />
            Downvote ({displayItem.downvotes || 0})
          </Button>
        </div>
        
        {displayItem.tags && displayItem.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {displayItem.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-mono">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="border-t pt-4">
          <h3 className="font-mono font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comments ({comments.length})
          </h3>
          
          {isAuthenticated ? (
            <form onSubmit={handleSubmitComment} className="flex gap-2 mb-4">
              <span className="text-xs text-muted-foreground self-center font-mono whitespace-nowrap">
                {user?.username}
              </span>
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 font-mono text-sm"
                data-testid="input-comment-content"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={commentMutation.isPending}
                data-testid="button-submit-comment"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
              <LogIn className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-mono">
                Sign in to leave a comment
              </span>
            </div>
          )}
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className="bg-muted/30 rounded p-2 text-sm flex gap-2"
                  data-testid={`text-comment-${comment.id}`}
                >
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    {comment.userAvatarUrl ? (
                      <AvatarImage src={normalizeStorageUrl(comment.userAvatarUrl)} alt={comment.visitorName || "User"} />
                    ) : null}
                    <AvatarFallback className="text-[8px]">
                      <User className="w-3 h-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-semibold text-xs text-primary">
                        {comment.visitorName || "Anonymous"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {comment.createdAt && new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArtGallery() {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const visitorId = getVisitorId();

  const { data: allItems = [], isLoading, refetch } = useQuery<GalleryItem[]>({
    queryKey: ["/api/gallery"],
  });

  const { data: featuredItems = [] } = useQuery<GalleryItem[]>({
    queryKey: ["/api/gallery", "featured"],
  });

  const voteMutation = useMutation({
    mutationFn: async ({ id, voteType }: { id: string; voteType: "up" | "down" }) => {
      return apiRequest("POST", `/api/gallery/${id}/vote`, { voteType, visitorId });
    },
    onSuccess: (_data, variables) => {
      // Invalidate all gallery queries including individual item
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery", variables.id] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to vote.", variant: "destructive" });
    },
  });

  const handleVote = (id: string, voteType: "up" | "down") => {
    voteMutation.mutate({ id, voteType });
  };

  const displayItems = activeTab === "featured" 
    ? featuredItems 
    : activeTab === "top"
    ? [...allItems].sort((a, b) => ((b.upvotes || 0) - (b.downvotes || 0)) - ((a.upvotes || 0) - (a.downvotes || 0)))
    : allItems;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 font-mono text-lg">
            <Image className="w-5 h-5 text-primary" />
            NORMIE Art Gallery
          </CardTitle>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-upload-artwork">
                <Upload className="w-4 h-4 mr-2" />
                Submit Art
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-mono">Submit Your Artwork</DialogTitle>
              </DialogHeader>
              <UploadForm onSuccess={() => {
                setUploadOpen(false);
                refetch();
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="all" className="font-mono text-xs" data-testid="tab-gallery-all">
              <Grid3X3 className="w-3 h-3 mr-1" />
              All
            </TabsTrigger>
            <TabsTrigger value="featured" className="font-mono text-xs" data-testid="tab-gallery-featured">
              <Sparkles className="w-3 h-3 mr-1" />
              Featured
            </TabsTrigger>
            <TabsTrigger value="top" className="font-mono text-xs" data-testid="tab-gallery-top">
              <Trophy className="w-3 h-3 mr-1" />
              Top Rated
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Image className="w-12 h-12 mb-2 opacity-50" />
                <p className="font-mono text-sm">No artwork yet</p>
                <p className="text-xs">Be the first to submit!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayItems.map((item) => (
                  <GalleryCard
                    key={item.id}
                    item={item}
                    onVote={handleVote}
                    onViewDetails={setSelectedItem}
                  />
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
      
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono">{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <ItemDetails item={selectedItem} onClose={() => setSelectedItem(null)} onVote={handleVote} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ArtGallery;