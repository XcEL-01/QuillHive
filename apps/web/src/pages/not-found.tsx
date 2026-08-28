import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Home as HomeIcon } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center bg-background px-4 py-16">
      <Card className="w-full max-w-lg border-border/60 shadow-xl shadow-primary/5">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center sm:px-12">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass className="h-9 w-9" aria-hidden="true" />
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">404</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">This page wandered off</h1>
          <p className="mt-4 max-w-sm text-muted-foreground">
            We couldn’t find the page you were looking for, but there’s plenty more to explore in the hive.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <Link href="/">
              <Button className="rounded-xl gap-2">
                <HomeIcon className="h-4 w-4" aria-hidden="true" />
                Go home
              </Button>
            </Link>
            <Link href="/explore" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Explore QuillHive
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
