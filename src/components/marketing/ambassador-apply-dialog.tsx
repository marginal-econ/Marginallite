import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, GraduationCap, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitAmbassadorApplication } from "@/lib/ambassador.functions";

export function AmbassadorApplyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const submitFn = useServerFn(submitAmbassadorApplication);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [country, setCountry] = useState("");
  const [linkedinOrSocial, setLinkedinOrSocial] = useState("");
  const [reason, setReason] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !school.trim() || !country.trim() || !reason.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFn({
        data: {
          fullName,
          email,
          school,
          country,
          linkedinOrSocial,
          reason,
        },
      });

      setIsSubmitted(true);
      toast.success("Ambassador application sent to Saikrish via Mailjet!");
    } catch (err: any) {
      toast.error(err?.message || "Could not submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setIsSubmitted(false);
    setFullName("");
    setEmail("");
    setSchool("");
    setCountry("");
    setLinkedinOrSocial("");
    setReason("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {isSubmitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Application Received!</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1">
                Your application has been routed directly to our founder <strong className="text-foreground">Saikrish Karthikeyan</strong> and the core leadership team via Mailjet. We review candidates on a rolling basis and will reach out to you at <strong className="text-foreground">{email}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-2">
              <Button type="button" onClick={handleReset} className="w-full">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <GraduationCap className="size-4" />
                Student &amp; Peer Network
              </div>
              <DialogTitle className="text-lg font-bold">
                Apply to Represent Marginal
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Join our ambassador cohort! Help classmates master Cambridge IGCSE Economics (0455). Your application goes straight to founder Saikrish.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-1 text-xs">
              <div className="space-y-1">
                <Label htmlFor="amb-name" className="text-xs font-semibold">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amb-name"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="amb-email" className="text-xs font-semibold">
                  Your Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amb-email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="amb-school" className="text-xs font-semibold">
                    School / College <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amb-school"
                    placeholder="e.g. Cambridge High"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="amb-country" className="text-xs font-semibold">
                    Country / City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amb-country"
                    placeholder="e.g. Singapore, UAE, UK"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="amb-social" className="text-xs font-semibold">
                  LinkedIn or Social Profile <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="amb-social"
                  placeholder="https://linkedin.com/in/..."
                  value={linkedinOrSocial}
                  onChange={(e) => setLinkedinOrSocial(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="amb-reason" className="text-xs font-semibold">
                  Why do you want to represent Marginal? <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="amb-reason"
                  placeholder="Tell us about your economics study journey, leadership, or how you plan to introduce Marginal to fellow students..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[85px] text-xs resize-none"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs h-8 gap-1.5 font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Sending via Mailjet...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
