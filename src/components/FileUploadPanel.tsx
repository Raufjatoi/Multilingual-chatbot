
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileInfo } from "@/types/types";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadPanelProps {
  files: FileInfo[];
  onRemoveFile: (fileName: string) => void;
}

export const FileUploadPanel = ({ files, onRemoveFile }: FileUploadPanelProps) => {
  if (files.length === 0) return null;

  return (
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
              <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm font-medium truncate max-w-[200px]">
                {file.name}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-6 h-6 ml-2"
                onClick={() => onRemoveFile(file.name)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
