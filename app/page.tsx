import { ScreenRecorder } from "@/app/components/ScreenRecorder";
import { Coffee, Linkedin } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center p-6">
      <header className="w-full max-w-4xl mx-auto py-6 mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ScreenClip</h1>
        <div className="flex items-center gap-4">
          <a 
            href="https://buymeacoffee.com/camilocbarrera" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-1"
          >
            <Coffee className="h-4 w-4" />
            <span>Buy me a coffee</span>
          </a>
          <a 
            href="https://www.linkedin.com/in/cristiancamilocorrea/"
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-1"
          >
            <Linkedin className="h-4 w-4" />
            <span>LinkedIn</span>
          </a>
        </div>
      </header>
      
      <main className="flex-1 w-full flex flex-col items-center justify-center">
        <ScreenRecorder />
      </main>
      
      <footer className="w-full max-w-4xl mx-auto py-6 mt-12 text-center text-sm text-slate-500 dark:text-slate-400">
        <div>ScreenClip — Simple screen recording for everyone</div>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a 
            href="https://buymeacoffee.com/camilocbarrera" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1"
          >
            <Coffee className="h-4 w-4" />
            <span>Support the project</span>
          </a>
          <a 
            href="https://www.linkedin.com/in/cristiancamilocorrea/"
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1"
          >
            <Linkedin className="h-4 w-4" />
            <span>Connect on LinkedIn</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
