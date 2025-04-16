
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileInfo } from "@/types/types";
import { FileText, FileType, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isPDF } from "@/services/pdf-service";

interface FileUploadPanelProps {
  files: FileInfo[];
  onRemoveFile: (fileName: string) => void;
}

export const FileUploadPanel = ({ files, onRemoveFile }: FileUploadPanelProps) => {
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);

  const getFileIcon = (file: FileInfo) => {
    if (isPDF(new File([], file.name, { type: file.type }))) {
      return <FileType className="h-4 w-4 mr-2 text-red-500" />;
    }
    return <FileText className="h-4 w-4 mr-2 text-muted-foreground" />;
  };

  if (files.length === 0) return null;

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-md">Uploaded Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <div 
                key={file.name}
                className="flex items-center bg-muted rounded-md p-2 pr-4"
              >
                {getFileIcon(file)}
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-6 h-6 ml-2"
                  onClick={() => setPreviewFile(file)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-6 h-6 ml-1"
                  onClick={() => onRemoveFile(file.name)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewFile !== null} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
            {previewFile?.content}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
};
