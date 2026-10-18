
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { useAuth } from "@/context/AuthContext";
import { S_getAllUsersForAdmin, S_updateUserByAdmin, S_deleteUserByAdmin } from "@/actions/admin-actions";
import type { AdminUserView } from "@/types";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, MoreHorizontal, Pencil, Search, Trash2, UserX, Users, UserCheck, ArrowUp, ArrowDown } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

type SortableUserKeys = 'displayName' | 'email' | 'lastSignInTime' | 'creationTime' | 'disabled' | 'groupCount';

const sortData = <T extends AdminUserView>(data: T[], config: { key: SortableUserKeys; direction: 'ascending' | 'descending' } | null): T[] => {
    if (!config) return data;
    const sortedData = [...data];
    sortedData.sort((a, b) => {
        const key = config.key;
        
        const aValue = key === 'groupCount' ? a.groups?.length || 0 : a[key as keyof AdminUserView];
        const bValue = key === 'groupCount' ? b.groups?.length || 0 : b[key as keyof AdminUserView];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        let comparison = 0;
        if (key === 'creationTime' || key === 'lastSignInTime') {
            const dateA = aValue ? new Date(aValue as string).getTime() : 0;
            const dateB = bValue ? new Date(bValue as string).getTime() : 0;
            comparison = dateA - dateB;
        } else if (key === 'disabled') {
            comparison = (aValue === bValue) ? 0 : aValue ? 1 : -1;
        } else if (key === 'groupCount') {
            comparison = (aValue as number) - (bValue as number);
        }
        else {
            comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return config.direction === 'ascending' ? comparison : -comparison;
    });
    return sortedData;
}

export default function AdminUsersPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [users, setUsers] = useState<AdminUserView[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: SortableUserKeys; direction: 'ascending' | 'descending' }>({ key: 'creationTime', direction: 'descending' });

    const [userToDelete, setUserToDelete] = useState<AdminUserView | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    
    const [userToEdit, setUserToEdit] = useState<AdminUserView | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [editFormState, setEditFormState] = useState({ displayName: '', email: '', disabled: false });

    const isOwner = currentUser?.uid === process.env.NEXT_PUBLIC_OWNER_UID;

    const fetchUsers = useCallback(async () => {
        if (!currentUser) return;
        setIsLoadingUsers(true);
        const result = await S_getAllUsersForAdmin(currentUser.uid);
        if (result.users) {
            setUsers(result.users);
        } else if (result.error) {
            setError(result.error);
        }
        setIsLoadingUsers(false);
    }, [currentUser]);

    useEffect(() => {
        if (!authLoading && currentUser) {
            if (!isOwner) {
                router.replace('/dashboard');
            } else {
                fetchUsers();
            }
        } else if (!authLoading && !currentUser) {
            router.replace('/login');
        }
    }, [authLoading, isOwner, router, fetchUsers, currentUser]);

    const requestSort = (key: SortableUserKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableUserKeys) => {
        if (sortConfig?.key !== key) return null;
        return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    const filteredAllUsers = useMemo(() => {
        if (!searchTerm) return users;
        const lowercasedTerm = searchTerm.toLowerCase();
        return users.filter(user =>
            (user.displayName || '').toLowerCase().includes(lowercasedTerm) ||
            (user.email || '').toLowerCase().includes(lowercasedTerm)
        );
    }, [users, searchTerm]);

    const sortedAllUsers = useMemo(() => sortData(filteredAllUsers, sortConfig), [filteredAllUsers, sortConfig]);
    
    const inactiveUsers = useMemo(() => {
        return users.filter(user => {
            if (!user.creationTime) return false;
            if (!user.lastSignInTime) return true;
            const creation = new Date(user.creationTime).getTime();
            const lastSignIn = new Date(user.lastSignInTime).getTime();
            return Math.abs(creation - lastSignIn) < 60 * 1000;
        });
    }, [users]);

    const activeUsers = useMemo(() => {
        return users.filter(user => {
            if (!user.creationTime || !user.lastSignInTime) return false;
            const creation = new Date(user.creationTime).getTime();
            const lastSignIn = new Date(user.lastSignInTime).getTime();
            return Math.abs(creation - lastSignIn) >= 60 * 1000;
        });
    }, [users]);

    const filteredInactiveUsers = useMemo(() => {
        if (!searchTerm) return inactiveUsers;
        const lowercasedTerm = searchTerm.toLowerCase();
        return inactiveUsers.filter(user =>
            (user.displayName || '').toLowerCase().includes(lowercasedTerm) ||
            (user.email || '').toLowerCase().includes(lowercasedTerm)
        );
    }, [inactiveUsers, searchTerm]);
    const sortedInactiveUsers = useMemo(() => sortData(filteredInactiveUsers, sortConfig), [filteredInactiveUsers, sortConfig]);
    
    const filteredActiveUsers = useMemo(() => {
        if (!searchTerm) return activeUsers;
        const lowercasedTerm = searchTerm.toLowerCase();
        return activeUsers.filter(user =>
            (user.displayName || '').toLowerCase().includes(lowercasedTerm) ||
            (user.email || '').toLowerCase().includes(lowercasedTerm)
        );
    }, [activeUsers, searchTerm]);
    const sortedActiveUsers = useMemo(() => sortData(filteredActiveUsers, sortConfig), [filteredActiveUsers, sortConfig]);

    const handleEditClick = (user: AdminUserView) => {
        setUserToEdit(user);
        setEditFormState({
            displayName: user.displayName || '',
            email: user.email || '',
            disabled: user.disabled,
        });
        setIsEditSheetOpen(true);
    };

    const handleEditSubmit = async () => {
        if (!userToEdit || !currentUser) return;
        const result = await S_updateUserByAdmin(currentUser.uid, userToEdit.uid, editFormState);
        if (result.success) {
            toast({ title: "Success", description: result.message });
            setIsEditSheetOpen(false);
            setUserToEdit(null);
            fetchUsers();
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    };

    const handleDeleteClick = (user: AdminUserView) => {
        setUserToDelete(user);
        setIsDeleteAlertOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete || !currentUser) return;
        const result = await S_deleteUserByAdmin(currentUser.uid, userToDelete.uid);
        if (result.success) {
            toast({ title: "User Deleted", description: result.message });
            fetchUsers();
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setIsDeleteAlertOpen(false);
        setUserToDelete(null);
    };
    
    const renderTable = (data: AdminUserView[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[25%]"><Button variant="ghost" className="px-0 hover:bg-transparent" onClick={() => requestSort('displayName')}>User{getSortIndicator('displayName')}</Button></TableHead>
                    <TableHead className="w-[25%]"><Button variant="ghost" onClick={() => requestSort('groupCount')}>Grupos{getSortIndicator('groupCount')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('lastSignInTime')}>Last Sign-In{getSortIndicator('lastSignInTime')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('creationTime')}>Created{getSortIndicator('creationTime')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('disabled')}>Status{getSortIndicator('disabled')}</Button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoadingUsers ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : (
                    data.map(user => (
                        <TableRow key={user.uid}>
                            <TableCell>
                                <Link href={`/profile/${user.uid}`} className="flex items-center gap-3 group">
                                    <Avatar>
                                        <AvatarImage src={user.photoURL || undefined} />
                                        <AvatarFallback>{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium group-hover:underline">{user.displayName || 'No Name'}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </Link>
                            </TableCell>
                            <TableCell>
                                {user.groups && user.groups.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                        {user.groups.map(group => (
                                            <Badge key={group.id} variant="secondary" className="font-normal">
                                            <Link href={`/groups/${group.id}`} className="hover:underline truncate" title={group.name}>
                                                {group.name}
                                            </Link>
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground text-xs">Sin grupos</span>
                                )}
                            </TableCell>
                            <TableCell>{user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleDateString('en-CA') : 'Never'}</TableCell>
                            <TableCell>{user.creationTime ? new Date(user.creationTime).toLocaleDateString('en-CA') : 'Unknown'}</TableCell>
                            <TableCell>
                                <Badge variant={user.disabled ? "destructive" : "secondary"}>{user.disabled ? "Disabled" : "Enabled"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => handleEditClick(user)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDeleteClick(user)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );

    if (authLoading || !currentUser || !isOwner) {
        return (
            <PageShell title="Admin" description="Loading...">
                <Skeleton className="h-48 w-full" />
            </PageShell>
        );
    }
    
    if (error) {
        return (
            <PageShell title="Admin Error">
                <Card className="text-center py-10">
                    <CardHeader>
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                        <CardTitle>Access Denied or Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                </Card>
            </PageShell>
        );
    }

    return (
        <PageShell title="User Management" description="Oversee all registered users in the system.">
            <div className="relative mb-4 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                />
            </div>

            <Tabs defaultValue="all-users">
                <TabsList className="grid w-full grid-cols-3 max-w-lg">
                    <TabsTrigger value="all-users"><Users className="mr-2 h-4 w-4"/> All Users ({users.length})</TabsTrigger>
                    <TabsTrigger value="active-users"><UserCheck className="mr-2 h-4 w-4" /> Active Users ({activeUsers.length})</TabsTrigger>
                    <TabsTrigger value="inactive-users"><UserX className="mr-2 h-4 w-4" /> Inactive Users ({inactiveUsers.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="all-users">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Users</CardTitle>
                            <CardDescription>A list of all users in the GroupHub system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {renderTable(sortedAllUsers)}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="active-users">
                     <Card>
                        <CardHeader>
                            <CardTitle>Active Users</CardTitle>
                            <CardDescription>Users who have signed in again after their initial registration.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {sortedActiveUsers.length === 0 && !isLoadingUsers ? 
                                <div className="text-center py-10 text-muted-foreground">No active users found.</div> : 
                                renderTable(sortedActiveUsers)}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="inactive-users">
                     <Card>
                        <CardHeader>
                            <CardTitle>Inactive Users</CardTitle>
                            <CardDescription>Users who have never signed in, or only signed in once at the time of creation.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {sortedInactiveUsers.length === 0 && !isLoadingUsers ? 
                                <div className="text-center py-10 text-muted-foreground">No inactive users found.</div> : 
                                renderTable(sortedInactiveUsers)}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Edit User Dialog */}
            <Dialog open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User: {userToEdit?.displayName || userToEdit?.uid}</DialogTitle>
                        <DialogDescription>Modify the user's details below.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="displayName" className="text-right">Name</Label>
                            <Input id="displayName" value={editFormState.displayName} onChange={e => setEditFormState({...editFormState, displayName: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">Email</Label>
                            <Input id="email" type="email" value={editFormState.email} onChange={e => setEditFormState({...editFormState, email: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="disabled" className="text-right">Disabled</Label>
                            <Switch id="disabled" checked={editFormState.disabled} onCheckedChange={checked => setEditFormState({...editFormState, disabled: checked})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditSheetOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditSubmit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete User Alert */}
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user account for <span className="font-medium">{userToDelete?.email}</span> and remove their data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete User</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageShell>
    );
}
