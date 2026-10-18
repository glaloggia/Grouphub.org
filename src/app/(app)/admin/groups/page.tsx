
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { useAuth } from "@/context/AuthContext";
import { getAllGroups, updateGroupSettings, S_deleteGroup } from "@/actions/group-actions";
import { S_getMultipleContactableUserDetails } from "@/actions/user-profile-actions";
import type { Group, ContactableUser } from "@/types";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, MoreHorizontal, Pencil, Search, Trash2, Users, Lock, Eye, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

const translations = {
  en: {
    title: "Group Management",
    description: "Oversee all groups in the system, including public and private ones.",
    searchPlaceholder: "Search by name or creator...",
    group: "Group",
    members: "Members",
    visibility: "Visibility",
    public: "Public",
    private: "Private",
    creator: "Creator",
    created: "Created",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    editGroupTitle: "Edit Group",
    editGroupDescription: "Modify the group's details below.",
    groupName: "Group Name",
    groupDescription: "Description",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    deleteGroupTitle: "Are you sure?",
    deleteGroupDescription: (name: string) => `This action cannot be undone. This will permanently delete the group "${name}" and all of its associated data (events, messages, etc.).`,
    deleteConfirm: "Yes, delete",
    groupUpdated: "Group updated",
    groupDeleted: "Group deleted",
    errorUpdating: "Error updating group",
    errorDeleting: "Error deleting group",
    loading: "Loading...",
  },
  es: {
    title: "Gestión de Grupos",
    description: "Supervisa todos los grupos del sistema, incluyendo públicos y privados.",
    searchPlaceholder: "Buscar por nombre o creador...",
    group: "Grupo",
    members: "Miembros",
    visibility: "Visibilidad",
    public: "Público",
    private: "Privado",
    creator: "Creador",
    created: "Creado",
    actions: "Acciones",
    edit: "Editar",
    delete: "Eliminar",
    editGroupTitle: "Editar Grupo",
    editGroupDescription: "Modificar los detalles del grupo.",
    groupName: "Nombre del Grupo",
    groupDescription: "Descripción del Grupo",
    saveChanges: "Guardar Cambios",
    cancel: "Cancelar",
    deleteGroupTitle: "¿Estás seguro?",
    deleteGroupDescription: (name: string) => `Esta acción no se puede deshacer. Se eliminará permanentemente el grupo "${name}" y todos sus datos asociados (eventos, mensajes, etc.).`,
    deleteConfirm: "Sí, eliminar",
    groupUpdated: "Grupo actualizado",
    groupDeleted: "Grupo eliminado",
    errorUpdating: "Error al actualizar el grupo",
    errorDeleting: "Error al eliminar el grupo",
    loading: "Cargando...",
  },
  ru: {
    title: "Управление группами",
    description: "Контролируйте все группы в системе, включая публичные и частные.",
    searchPlaceholder: "Поиск по названию или создателю...",
    group: "Группа",
    members: "Участники",
    visibility: "Видимость",
    public: "Публичная",
    private: "Частная",
    creator: "Создатель",
    created: "Создано",
    actions: "Действия",
    edit: "Редактировать",
    delete: "Удалить",
    editGroupTitle: "Редактировать группу",
    editGroupDescription: "Измените детали группы ниже.",
    groupName: "Название группы",
    groupDescription: "Описание",
    saveChanges: "Сохранить изменения",
    cancel: "Отмена",
    deleteGroupTitle: "Вы уверены?",
    deleteGroupDescription: (name: string) => `Это действие нельзя отменить. Это навсегда удалит группу "${name}" и все связанные с ней данные (события, сообщения и т.д.).`,
    deleteConfirm: "Да, удалить",
    groupUpdated: "Группа обновлена",
    groupDeleted: "Группа удалена",
    errorUpdating: "Ошибка при обновлении группы",
    errorDeleting: "Ошибка при удалении группы",
    loading: "Загрузка...",
  }
};

type EnhancedGroup = Group & { memberCount: number; creatorName: string; };
type SortableGroupKeys = 'name' | 'memberCount' | 'isPublic' | 'creatorName' | 'createdAt';

export default function AdminGroupsPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [groups, setGroups] = useState<Group[]>([]);
    const [creators, setCreators] = useState<Record<string, ContactableUser>>({});
    const [isLoadingGroups, setIsLoadingGroups] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [lang, setLang] = useState<'en' | 'es' | 'ru'>('en');
    const [sortConfig, setSortConfig] = useState<{ key: SortableGroupKeys; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });

    const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    
    const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [editFormState, setEditFormState] = useState({ name: '', description: '', isPublic: false });

    const isOwner = currentUser?.uid === process.env.NEXT_PUBLIC_OWNER_UID;
    const t = translations[lang] || translations['en'];

    useEffect(() => {
        if (typeof window !== "undefined" && navigator.language) {
            const browserLang = navigator.language.split('-')[0] as 'en' | 'es' | 'ru';
            if (browserLang === 'es') setLang('es');
            else if (browserLang === 'ru') setLang('ru');
        }
    }, []);

    const fetchGroups = useCallback(async () => {
        if (!currentUser) return;
        setIsLoadingGroups(true);
        try {
            const allGroups = await getAllGroups();
            setGroups(allGroups);

            const creatorIds = [...new Set(allGroups.map(g => g.creatorId).filter(Boolean))];
            if (creatorIds.length > 0) {
                const creatorDetails = await S_getMultipleContactableUserDetails(creatorIds);
                setCreators(creatorDetails);
            }
        } catch (e: any) {
            setError(e.message || "Failed to load groups.");
        }
        setIsLoadingGroups(false);
    }, [currentUser]);

    useEffect(() => {
        if (!authLoading && currentUser) {
            if (!isOwner) {
                router.replace('/dashboard');
            } else {
                fetchGroups();
            }
        } else if (!authLoading && !currentUser) {
            router.replace('/login');
        }
    }, [authLoading, isOwner, router, fetchGroups, currentUser]);

    const requestSort = (key: SortableGroupKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableGroupKeys) => {
        if (sortConfig?.key !== key) return null;
        return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    const enhancedGroups = useMemo(() => {
        return groups.map(g => ({
            ...g,
            memberCount: g.memberIds.length,
            creatorName: creators[g.creatorId]?.name || 'Unknown',
        }));
    }, [groups, creators]);
    
    const filteredGroups = useMemo(() => {
        if (!searchTerm) return enhancedGroups;
        const lowercasedTerm = searchTerm.toLowerCase();
        return enhancedGroups.filter(group => 
            (group.name || '').toLowerCase().includes(lowercasedTerm) ||
            (group.creatorName || '').toLowerCase().includes(lowercasedTerm)
        );
    }, [enhancedGroups, searchTerm]);

    const sortedGroups = useMemo(() => {
        let sortableItems = [...filteredGroups];
        if (sortConfig) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;
                
                let comparison = 0;
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue - bValue;
                } else if (sortConfig.key === 'createdAt' && typeof aValue === 'string' && typeof bValue === 'string') {
                    const dateA = new Date(aValue).getTime();
                    const dateB = new Date(bValue).getTime();
                    comparison = dateA - dateB;
                } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                    comparison = aValue === bValue ? 0 : aValue ? -1 : 1;
                } else {
                    comparison = String(aValue).localeCompare(String(bValue));
                }
                
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return sortableItems;
    }, [filteredGroups, sortConfig]);

    const handleEditClick = (group: Group) => {
        setGroupToEdit(group);
        setEditFormState({
            name: group.name || '',
            description: group.description || '',
            isPublic: group.isPublic,
        });
        setIsEditSheetOpen(true);
    };

    const handleEditSubmit = async () => {
        if (!groupToEdit || !currentUser || !isOwner) return;

        const result = await updateGroupSettings(groupToEdit.id, editFormState, currentUser.uid);
        if (result.success) {
            toast({ title: t.groupUpdated });
            setIsEditSheetOpen(false);
            setGroupToEdit(null);
            fetchGroups();
        } else {
            toast({ title: t.errorUpdating, description: result.message, variant: "destructive" });
        }
    };

    const handleDeleteClick = (group: Group) => {
        setGroupToDelete(group);
        setIsDeleteAlertOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!groupToDelete || !currentUser || !isOwner) return;

        const result = await S_deleteGroup(groupToDelete.id, currentUser.uid);
        if (result.success) {
            toast({ title: t.groupDeleted });
            fetchGroups();
        } else {
            toast({ title: t.errorDeleting, description: result.message, variant: "destructive" });
        }
        setIsDeleteAlertOpen(false);
        setGroupToDelete(null);
    };

    if (authLoading || !isOwner) {
        return <PageShell title={t.loading}><Skeleton className="h-48 w-full" /></PageShell>;
    }
    
    if (error) {
        return (
            <PageShell title="Error">
                <Card className="text-center py-10"><CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><CardTitle>Error</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
            </PageShell>
        );
    }

    return (
        <PageShell title={t.title} description={t.description}>
            <div className="relative mb-4 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
            </div>

            <Card>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Button variant="ghost" className="px-0 hover:bg-transparent" onClick={() => requestSort('name')}>{t.group} {getSortIndicator('name')}</Button></TableHead>
                                <TableHead className="text-center"><Button variant="ghost" onClick={() => requestSort('memberCount')}>{t.members} {getSortIndicator('memberCount')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('isPublic')}>{t.visibility} {getSortIndicator('isPublic')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('creatorName')}>{t.creator} {getSortIndicator('creatorName')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('createdAt')}>{t.created} {getSortIndicator('createdAt')}</Button></TableHead>
                                <TableHead className="text-right">{t.actions}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingGroups ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                                ))
                            ) : (
                                sortedGroups.map(group => (
                                    <TableRow key={group.id}>
                                        <TableCell>
                                            <Link href={`/groups/${group.id}`} className="flex items-center gap-3 group">
                                                <Avatar><AvatarImage src={group.image || undefined} /><AvatarFallback>{(group.name || 'G').charAt(0)}</AvatarFallback></Avatar>
                                                <div><p className="font-medium group-hover:underline">{group.name}</p></div>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-center">{group.memberCount}</TableCell>
                                        <TableCell>
                                            <Badge variant={group.isPublic ? "secondary" : "outline"} className="gap-1">
                                                {group.isPublic ? <Eye className="h-3 w-3"/> : <Lock className="h-3 w-3"/>}
                                                {group.isPublic ? t.public : t.private}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{group.creatorName}</TableCell>
                                        <TableCell>{group.createdAt ? new Date(group.createdAt).toLocaleDateString('en-CA') : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleEditClick(group)}><Pencil className="mr-2 h-4 w-4" /> {t.edit}</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(group)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> {t.delete}</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t.editGroupTitle}</DialogTitle><DialogDescription>{t.editGroupDescription}</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="groupName" className="text-right">{t.groupName}</Label><Input id="groupName" value={editFormState.name} onChange={e => setEditFormState({...editFormState, name: e.target.value})} className="col-span-3" /></div>
                        <div className="grid grid-cols-4 items-start gap-4"><Label htmlFor="description" className="text-right pt-2">{t.groupDescription}</Label><Textarea id="description" value={editFormState.description} onChange={e => setEditFormState({...editFormState, description: e.target.value})} className="col-span-3" /></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="isPublic" className="text-right">{t.visibility}</Label><Switch id="isPublic" checked={editFormState.isPublic} onCheckedChange={checked => setEditFormState({...editFormState, isPublic: checked})} /></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsEditSheetOpen(false)}>{t.cancel}</Button><Button onClick={handleEditSubmit}>{t.saveChanges}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t.deleteGroupTitle}</AlertDialogTitle><AlertDialogDescription>{t.deleteGroupDescription(groupToDelete?.name || '')}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">{t.deleteConfirm}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageShell>
    );
}
