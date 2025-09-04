import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NicknameModalProps {
  open: boolean;
  onClose: () => void;
}

export function NicknameModal({ open, onClose }: NicknameModalProps) {
  const [nickname, setNickname] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const nicknameMutation = useMutation({
    mutationFn: async (nickname: string) => {
      await apiRequest('POST', '/api/auth/nickname', { nickname });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
      toast({ title: "Welcome to MusicReview!" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to set nickname", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (nickname.length < 3 || nickname.length > 20) {
      toast({
        title: "Invalid nickname",
        description: "Nickname must be 3-20 characters",
        variant: "destructive"
      });
      return;
    }

    nicknameMutation.mutate(nickname);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">Choose Your Nickname</DialogTitle>
          <p className="text-center text-muted-foreground text-sm">
            This will be your display name in the community
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter unique nickname"
              maxLength={20}
              required
              data-testid="input-nickname"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must be unique and 3-20 characters
            </p>
          </div>

          <Button
            type="submit"
            disabled={nicknameMutation.isPending || nickname.length < 3}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-complete"
          >
            {nicknameMutation.isPending ? "Setting up..." : "Complete Registration"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
