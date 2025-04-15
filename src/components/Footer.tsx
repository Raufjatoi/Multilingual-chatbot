
import { ExternalLink } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="py-6 px-4 border-t">
      <div className="container flex flex-col items-center justify-center gap-4 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground">
          © {new Date().getFullYear()} • Built by{" "}
          <a
            href="https://rauf-psi.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 hover:text-primary inline-flex items-center gap-1"
          >
            Abdul Rauf Jatoi <ExternalLink className="h-3 w-3" />
          </a>{" "}
          | ICreativez
        </p>
      </div>
    </footer>
  );
};
