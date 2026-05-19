import { Shell } from "@/components/layout/Shell";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <Shell>
      <div className="crm-section p-8 max-w-md mx-auto text-center">
        <div className="flex mb-4 gap-2 items-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <h1 className="text-2xl font-serif">404 Page Not Found</h1>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          The page you're looking for does not exist or has moved.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-primary hover:text-primary/80 underline underline-offset-2"
        >
          Return to Dashboard
        </Link>
      </div>
    </Shell>
  );
}
