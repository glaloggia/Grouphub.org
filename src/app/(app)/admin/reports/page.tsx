
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { useAuth } from "@/context/AuthContext";
import { S_getReports, S_updateReportStatus } from "@/actions/report-actions";
import type { Report } from "@/types";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, MoreHorizontal, Link as LinkIcon, Users, User, Calendar, ExternalLink, ShieldCheck, Trash2, Box, Eye, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { TimeAgo } from "@/components/shared/TimeAgo";

const entityIcons = {
    group: <Users className="h-4 w-4" />,
    user: <User className="h-4 w-4" />,
    event: <Calendar className="h-4 w-4" />,
};

const statusColors: { [key in Report['status']]: string } = {
    pending: 'bg-yellow-500',
    reviewed: 'bg-blue-500',
    action_taken: 'bg-green-500',
    dismissed: 'bg-gray-500',
};

export default function AdminReportsPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [reports, setReports] = useState<Report[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isOwner = currentUser?.uid === process.env.NEXT_PUBLIC_OWNER_UID;

    const fetchReports = useCallback(async () => {
        if (!currentUser || !isOwner) return;
        setIsLoadingReports(true);
        const result = await S_getReports(currentUser.uid);
        if (result.reports) {
            setReports(result.reports);
        } else if (result.error) {
            setError(result.error);
        }
        setIsLoadingReports(false);
    }, [currentUser, isOwner]);

    useEffect(() => {
        if (!authLoading && currentUser) {
            if (!isOwner) {
                router.replace('/dashboard');
            } else {
                fetchReports();
            }
        } else if (!authLoading && !currentUser) {
            router.replace('/login');
        }
    }, [authLoading, isOwner, router, fetchReports, currentUser]);

    const handleUpdateStatus = async (reportId: string, status: Report['status']) => {
        if (!currentUser || !isOwner) return;
        const result = await S_updateReportStatus(currentUser.uid, reportId, status);
        if (result.success) {
            toast({ title: "Status Updated", description: `Report status set to ${status}.` });
            fetchReports(); // Refresh the list
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    };
    
    const reportsByStatus = useMemo(() => {
        return reports.reduce((acc, report) => {
            (acc[report.status] = acc[report.status] || []).push(report);
            return acc;
        }, {} as Record<Report['status'], Report[]>);
    }, [reports]);

    const renderTable = (data: Report[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Reported Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoadingReports ? (
                     Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
                    ))
                ) : data.length === 0 ? (
                     <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No reports found in this category.</TableCell></TableRow>
                ) : (
                    data.map(report => (
                        <TableRow key={report.id}>
                            <TableCell>
                                <Link href={report.entityLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline text-primary">
                                    <LinkIcon className="h-4 w-4" /> 
                                    <span>{report.entityId.substring(0, 20)}...</span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                    {entityIcons[report.entityType]}
                                    <span className="ml-2">{report.entityType}</span>
                                </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{report.reason}</TableCell>
                            <TableCell>
                                <Link href={`/profile/${report.reporterId}`} className="hover:underline">
                                    {report.reporterName || report.reporterId.substring(0,10)}
                                </Link>
                            </TableCell>
                            <TableCell><TimeAgo dateString={report.timestamp} /></TableCell>
                            <TableCell className="text-right">
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem asChild>
                                            <Link href={report.entityLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> View Content</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger><ShieldCheck className="mr-2 h-4 w-4" /> Change Status</DropdownMenuSubTrigger>
                                            <DropdownMenuPortal>
                                                <DropdownMenuSubContent>
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, 'reviewed')}><Eye className="mr-2 h-4 w-4" /> Mark as Reviewed</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, 'action_taken')}><Check className="mr-2 h-4 w-4" /> Mark Action Taken</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, 'dismissed')}><X className="mr-2 h-4 w-4" /> Dismiss Report</DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuPortal>
                                        </DropdownMenuSub>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );

    if (authLoading || !isOwner) {
        return <PageShell title="Loading..." />;
    }

    const TABS: { status: Report['status'], label: string }[] = [
        { status: 'pending', label: 'Pending' },
        { status: 'reviewed', label: 'Reviewed' },
        { status: 'action_taken', label: 'Action Taken' },
        { status: 'dismissed', label: 'Dismissed' },
    ];

    return (
        <PageShell title="Content Reports" description="Manage user-submitted reports for various content types.">
             <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    {TABS.map(tab => (
                        <TabsTrigger key={tab.status} value={tab.status} className="capitalize">
                            <div className={`mr-2 h-2 w-2 rounded-full ${statusColors[tab.status]}`}/>
                            {tab.label}
                            <Badge variant="secondary" className="ml-2">{reportsByStatus[tab.status]?.length || 0}</Badge>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {TABS.map(tab => (
                     <TabsContent key={tab.status} value={tab.status}>
                        <Card>
                            <CardContent className="p-0">
                                {renderTable(reportsByStatus[tab.status] || [])}
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </PageShell>
    );
}
