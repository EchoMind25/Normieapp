import { useState, useEffect } from "react";
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
  Trophy
} from "lucide-react";
import type { GalleryItem, GalleryComment } from "@shared/schema";

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
      className="overflow-hidden hover-elevate cursor-pointer group"
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
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        toast({ title: "Error", description: "Only JPG and PNG images are allowed.", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be under 5MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setImageUrl("");
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
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("image", selectedFile);
        const response = await fetch("/api/gallery/upload", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }
        const result = await response.json();
        finalImageUrl = result.url;
      } catch (error: any) {
        toast({ title: "Upload Error", description: error.message || "Failed to upload image.", variant: "destructive" });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
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
        <Label htmlFor="imageFile">Upload Image</Label>
        <Input
          id="imageFile"
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          className="font-mono cursor-pointer"
          data-testid="input-gallery-file"
        />
        {selectedFile && (
          <p className="text-xs text-muted-foreground mt-1">
            Selected: {selectedFile.name}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          JPG or PNG, max 5MB
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div>
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input
          id="imageUrl"
          value={imageUrl}
          onChange={(e) => { setImageUrl(e.target.value); setSelectedFile(null); }}
          placeholder="https://example.com/image.png"
          className="font-mono"
          disabled={!!selectedFile}
          data-testid="input-gallery-image-url"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Or paste a direct link to your meme image
        </p>
      </div>
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
}

function ItemDetails({ item, onClose }: ItemDetailsProps) {
  const [newComment, setNewComment] = useState("");
  const [commentName, setCommentName] = useState("");
  const { toast } = useToast();
  const visitorId = getVisitorId();

  const { data: comments = [], refetch: refetchComments } = useQuery<GalleryComment[]>({
    queryKey: ["/api/gallery", item.id, "comments"],
  });

  const commentMutation = useMutation({
    mutationFn: async (data: { content: string; visitorName: string }) => {
      return apiRequest("POST", `/api/gallery/${item.id}/comments`, data);
    },
    onSuccess: () => {
      setNewComment("");
      refetchComments();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post comment.", variant: "destructive" });
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    commentMutation.mutate({
      content: newComment,
      visitorName: commentName || "Anonymous",
    });
  };

  const score = (item.upvotes || 0) - (item.downvotes || 0);

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <div className="relative">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full max-h-[50vh] object-contain bg-black/50 rounded-lg"
        />
        {item.featured && (
          <Badge className="absolute top-2 right-2 bg-yellow-500/90">
            <Star className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        )}
      </div>
      
      <div className="mt-4 space-y-4">
        <div>
          <h2 className="text-xl font-mono font-bold">{item.title}</h2>
          <p className="text-sm text-muted-foreground font-mono">
            by {item.creatorName || "Anonymous"}
          </p>
        </div>
        
        {item.description && (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {item.views || 0} views
          </span>
          <span className="flex items-center gap-1 text-green-400">
            <ThumbsUp className="w-4 h-4" />
            {item.upvotes || 0}
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <ThumbsDown className="w-4 h-4" />
            {item.downvotes || 0}
          </span>
          <span className="font-bold">
            Score: {score > 0 ? "+" : ""}{score}
          </span>
        </div>
        
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag, i) => (
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
          
          <form onSubmit={handleSubmitComment} className="flex gap-2 mb-4">
            <Input
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              placeholder="Name"
              className="w-24 font-mono text-sm"
              data-testid="input-comment-name"
            />
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
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className="bg-muted/30 rounded p-2 text-sm"
                  data-testid={`text-comment-${comment.id}`}
                >
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
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
            <ItemDetails item={selectedItem} onClose={() => setSelectedItem(null)} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ArtGallery;