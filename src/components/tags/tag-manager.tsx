'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateTags } from '@/lib/actions';
import type { Tag } from '@/lib/types';
import { Edit, PlusCircle, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagManagerProps {
  allTags: Tag[];
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  onTagsUpdate: (tags: Tag[]) => void;
}

export function TagManager({
  allTags,
  selectedTags,
  onSelectedTagsChange,
  onTagsUpdate,
}: TagManagerProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedTags, setEditedTags] = React.useState(allTags);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();

  React.useEffect(() => {
    setEditedTags(allTags);
  }, [allTags]);

  const handleTagClick = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    onSelectedTagsChange(newSelectedTags);
  };

  const handleSaveEdits = () => {
    startTransition(async () => {
      try {
        await updateTags(editedTags);
        onTagsUpdate(editedTags);
        toast({ title: 'Success', description: 'Labels updated successfully.' });
        setIsEditing(false);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update labels.' });
      }
    });
  };

  const handleAddNewTag = () => {
    const newTag = {
      id: `tag-${Date.now()}`,
      label: 'New Label',
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
    };
    setEditedTags([...editedTags, newTag]);
  };
  
  const handleTagChange = (id: string, field: 'label' | 'color', value: string) => {
    setEditedTags(editedTags.map(tag => (tag.id === id ? { ...tag, [field]: value } : tag)));
  };

  const handleDeleteTag = (id: string) => {
    setEditedTags(editedTags.filter(tag => tag.id !== id));
  };


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {allTags.map(tag => (
          <Badge
            key={tag.id}
            onClick={() => handleTagClick(tag.label)}
            className={cn(
              'cursor-pointer transition-all',
              selectedTags.includes(tag.label) ? 'ring-2 ring-offset-2 ring-foreground' : 'opacity-75 hover:opacity-100'
            )}
            style={{ backgroundColor: tag.color, color: 'white' }}
          >
            {tag.label}
          </Badge>
        ))}
      </div>

      <Dialog onOpenChange={(open) => { if(!open) setIsEditing(false)}}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Labels
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Labels</DialogTitle>
            <DialogDescription>Add, remove, or edit your custom labels.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-2">
            {editedTags.map(tag => (
              <div key={tag.id} className="flex items-center gap-2">
                <Input
                  type="color"
                  value={tag.color}
                  onChange={e => handleTagChange(tag.id, 'color', e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={tag.label}
                  onChange={e => handleTagChange(tag.id, 'label', e.target.value)}
                  className="flex-grow"
                />
                <Button variant="ghost" size="icon" onClick={() => handleDeleteTag(tag.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
           <Button variant="outline" size="sm" onClick={handleAddNewTag} className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Label
            </Button>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveEdits} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
