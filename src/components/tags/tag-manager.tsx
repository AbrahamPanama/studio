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
import type { Tag } from '@/lib/types';
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';


interface TagManagerProps {
  allTags: Tag[];
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  onTagsUpdate: (tags: Tag[]) => void;
  collectionName?: 'tagsOther';
}

export function TagManager({
  allTags,
  selectedTags,
  onSelectedTagsChange,
  onTagsUpdate,
  collectionName = 'tagsOther'
}: TagManagerProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedTags, setEditedTags] = React.useState<Tag[]>([]);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // When dialog opens, create a deep copy of allTags to edit
      setEditedTags(JSON.parse(JSON.stringify(allTags)));
    }
    setIsEditing(open);
  };

  const handleTagClick = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    onSelectedTagsChange(newSelectedTags);
  };

  const handleSaveEdits = () => {
    startTransition(async () => {
      if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firestore not available.' });
        return;
      }
      try {
        // 1. Capture new tags (IDs starting with temp-) BEFORE saving
        // We capture Labels because the system selects by Label
        const newTagsToAutoSelect = editedTags
            .filter(tag => tag.id.startsWith('temp-'))
            .map(tag => tag.label);

        const batch = writeBatch(firestore);
        const collectionRef = collection(firestore, collectionName);

        // --- Diffing Save Logic ---
        const currentIds = new Set(editedTags.map(t => t.id));
        const tagsToDelete = allTags.filter(t => !currentIds.has(t.id));

        tagsToDelete.forEach(tag => {
            if (!tag.id.startsWith('temp-')) {
                const docRef = doc(collectionRef, tag.id);
                batch.delete(docRef);
            }
        });

        editedTags.forEach(tag => {
            const isNew = tag.id.startsWith('temp-');
            const docRef = isNew ? doc(collectionRef) : doc(collectionRef, tag.id);
            batch.set(docRef, { label: tag.label, color: tag.color });
        });
        
        await batch.commit();
        
        // --- Refresh Data ---
        const freshSnapshot = await getDocs(collectionRef);
        const freshTags = freshSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as Tag));
        
        onTagsUpdate(freshTags);

        // 2. AUTO-SELECT LOGIC:
        // Update the selected tags on the parent component
        if (newTagsToAutoSelect.length > 0) {
            // Merge existing selection with new tags, avoiding duplicates
            const updatedSelection = Array.from(new Set([...selectedTags, ...newTagsToAutoSelect]));
            onSelectedTagsChange(updatedSelection);
        }

        toast({ title: 'Success', description: 'Labels updated and selected.' });
        setIsEditing(false);

      } catch (error: any) {
        console.error("Failed to update labels:", error);
        toast({ variant: 'destructive', title: 'Error', description: `Failed to update labels: ${error.message}` });
      }
    });
  };

  const handleAddNewTag = () => {
    const newTag: Tag = {
      id: `temp-${Date.now()}`,
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

      <Dialog open={isEditing} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
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
