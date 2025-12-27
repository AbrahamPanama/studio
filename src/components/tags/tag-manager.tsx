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
  collectionName?: 'tags' | 'tagsOther';
}

export function TagManager({
  allTags,
  selectedTags,
  onSelectedTagsChange,
  onTagsUpdate,
  collectionName = 'tags'
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
        const batch = writeBatch(firestore);
        const collectionRef = collection(firestore, collectionName);
        const originalTagMap = new Map(allTags.map(t => [t.id, t]));
        const editedTagMap = new Map(editedTags.map(t => [t.id, t]));

        // 1. Identify Deletions
        for (const originalTag of allTags) {
          if (!editedTagMap.has(originalTag.id)) {
            const docRef = doc(collectionRef, originalTag.id);
            batch.delete(docRef);
          }
        }

        // 2. Identify Updates and Creations
        for (const editedTag of editedTags) {
          const originalTag = originalTagMap.get(editedTag.id);
          
          if (editedTag.id.startsWith('temp-')) {
            // This is a new tag (Creation)
            const newDocRef = doc(collectionRef); // Let Firestore generate the ID
            const { id, ...tagData } = editedTag; // remove temp id
            batch.set(newDocRef, tagData);
          } else if (originalTag && (originalTag.label !== editedTag.label || originalTag.color !== editedTag.color)) {
            // This is an existing tag that has changed (Update)
            const docRef = doc(collectionRef, editedTag.id);
            batch.update(docRef, { label: editedTag.label, color: editedTag.color });
          }
        }
        
        await batch.commit();
        
        // 3. Refresh data from Firestore to get the source of truth
        const freshSnapshot = await getDocs(collectionRef);
        const freshTags = freshSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));

        onTagsUpdate(freshTags);
        
        toast({ title: 'Success', description: 'Labels updated successfully.' });
        handleOpenChange(false);

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
