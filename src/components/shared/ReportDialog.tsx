
"use client";

import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { S_createReport } from "@/actions/report-actions";

interface ReportDialogProps {
  entityId: string;
  entityType: 'group' | 'event' | 'user';
  entityLink: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ReportDialog({ entityId, entityType, entityLink, children, open, onOpenChange }: ReportDialogProps) {
  // If open/onOpenChange are provided, it's a controlled component.
  // Otherwise, it manages its own state.
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalIsOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalIsOpen;

  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (!open) {
          // Reset state when closing
          setReason("");
          setIsSubmitting(false);
      }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "You must be logged in to submit a report.", variant: "destructive" });
      return;
    }
    if (!reason.trim()) {
      toast({ title: "Reason Required", description: "Please provide a reason for your report.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const result = await S_createReport({
      entityId,
      entityType,
      entityLink,
      reporterId: currentUser.uid,
      reporterName: currentUser.displayName || "Anonymous",
      reason,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: "Report Submitted", description: "Thank you for your feedback. We will review it shortly." });
      handleOpenChange(false);
    } else {
      toast({ title: "Error", description: result.message || "Failed to submit your report.", variant: "destructive" });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report Content</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide a reason for reporting this {entityType}. Your report is anonymous to other users.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="report-reason" className="sr-only">Reason</Label>
          <Textarea
            id="report-reason"
            placeholder={`Why are you reporting this ${entityType}?`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
