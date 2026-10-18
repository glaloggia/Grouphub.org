
'use server';

import { getAdminFirestoreInstance, safeParseFirestoreTimestamp } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { Report } from '@/types';
import * as admin from 'firebase-admin';

// Helper to check if a user is the app owner
function isAppOwner(userId: string): boolean {
    const ownerUid = process.env.NEXT_PUBLIC_OWNER_UID;
    if (!ownerUid) {
        return false;
    }
    return userId === ownerUid;
}

const _docDataToReport = (doc: admin.firestore.DocumentSnapshot): Report => {
    const data = doc.data() || {};
    const validStatuses: Report['status'][] = ['pending', 'reviewed', 'action_taken', 'dismissed'];
    const status = validStatuses.includes(data.status) ? data.status : 'pending';

    return {
        id: doc.id,
        entityId: data.entityId || 'unknown_entity',
        entityType: ['group', 'event', 'user'].includes(data.entityType) ? data.entityType : 'user',
        entityLink: data.entityLink || '/dashboard',
        reporterId: data.reporterId || 'unknown_reporter',
        reporterName: data.reporterName || 'Anonymous',
        reason: data.reason || 'No reason provided.',
        status: status,
        timestamp: safeParseFirestoreTimestamp(data.timestamp),
    };
};

export async function S_createReport(
    data: Pick<Report, 'entityId' | 'entityType' | 'entityLink' | 'reporterId' | 'reporterName' | 'reason'>
): Promise<{ success: boolean; message?: string }> {
    if (!data.reporterId) {
        return { success: false, message: "You must be logged in to report content." };
    }
    if (!data.reason.trim()) {
        return { success: false, message: "A reason is required to submit a report." };
    }

    const db = getAdminFirestoreInstance();
    try {
        await db.collection("reports").add({
            ...data,
            status: 'pending',
            timestamp: FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("[S_createReport] Error creating report:", error);
        return { success: false, message: `Failed to submit report: ${(error as Error).message}` };
    }
}

export async function S_getReports(
    adminUserId: string,
    status?: Report['status']
): Promise<{ reports?: Report[]; error?: string }> {
    if (!isAppOwner(adminUserId)) {
        return { error: "Permission denied. You are not authorized for this action." };
    }

    const db = getAdminFirestoreInstance();
    try {
        let query: admin.firestore.Query = db.collection("reports");
        if (status) {
            query = query.where('status', '==', status);
        }
        
        const snapshot = await query.orderBy('timestamp', 'desc').get();
        const reports = snapshot.docs.map(_docDataToReport);
        return { reports };
    } catch (error) {
        console.error("[S_getReports] Error fetching reports:", error);
        return { error: `Failed to fetch reports: ${(error as Error).message}` };
    }
}

export async function S_updateReportStatus(
    adminUserId: string,
    reportId: string,
    status: Report['status']
): Promise<{ success: boolean; message?: string }> {
     if (!isAppOwner(adminUserId)) {
        return { success: false, message: "Permission denied. You are not authorized for this action." };
    }

    const db = getAdminFirestoreInstance();
    try {
        await db.collection("reports").doc(reportId).update({ status });
        return { success: true, message: "Report status updated." };
    } catch (error) {
        console.error(`[S_updateReportStatus] Error updating report ${reportId}:`, error);
        return { success: false, message: `Failed to update report status: ${(error as Error).message}` };
    }
}
