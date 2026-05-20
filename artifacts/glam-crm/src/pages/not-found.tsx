import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <Shell>
      <div className="mx-auto max-w-xl">
        <div className="crm-section overflow-hidden p-10 text-center sm:p-14">
          <div
            className="font-serif text-[6rem] leading-none text-foreground sm:text-[7.5rem]"
            style={{ fontVariationSettings: "'opsz' 144", letterSpacing: "-0.04em" }}
          >
            404
          </div>
          <div className="crm-gold-rule mx-auto mt-3 w-28" />
          <h1
            className="mt-5 font-serif text-2xl text-foreground"
            style={{ fontVariationSettings: "'opsz' 64" }}
          >
            This page is not on the schedule.
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            The page you're looking for doesn't exist, or it has been moved. Let's
            get you back to the studio.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Return to dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
