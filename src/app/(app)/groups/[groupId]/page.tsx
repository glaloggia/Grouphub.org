
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, MessageSquare, Settings, Users, Edit3, Trash2, PlusCircle, AlertTriangle, LockIcon, ArrowLeft, UserPlus, LogOut, ShieldAlert, UserX, Eye, MailWarning, CheckCircle, XCircle, Hourglass, Send, ShieldCheck, ShieldMinus, type LucideIcon, Archive, Search, RotateCcw, UploadCloud, Crown, MoreHorizontal, Share2, Copy, LogIn } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { Group as StoredGroupType, Event as FullEventData, GroupJoinRequest, ContactableUser, GroupMessage } from "@/types";
import { generateEventOccurrences, isEventInstancePast } from "@/lib/event-utils";
import { addMonths, startOfDay, subMonths, parseISO, formatISO, format } from "date-fns";
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";
import { 
    getGroupById, 
    updateGroupSettings, 
    S_deleteGroup,
    S_joinGroup, S_leaveGroup, S_removeMemberFromGroup, S_promoteToAdmin, S_demoteFromAdmin,
    S_requestToJoinGroup, S_getGroupJoinRequests, S_approveGroupJoinRequest, S_denyGroupJoinRequest,
} from '@/actions/group-actions';
import { S_getEventsForGroup } from '@/actions/event-actions';
import { S_getMessagesForGroup, S_postMessageToGroup } from '@/actions/group-message-actions';
import { S_getMultipleContactableUserDetails } from '@/actions/user-profile-actions';
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from 'react-markdown';
import { ReportDialog } from "@/components/shared/ReportDialog";
import { TimeAgo } from "@/components/shared/TimeAgo";


const DEFAULT_EVENT_IMAGE = "https://placehold.co/600x400.png";
const GROUP_LAST_READ_PREFIX = "group_last_read_";
const getDefaultVercelAvatar = (identifier: string | null | undefined) => `https://avatar.vercel.sh/${identifier || 'default'}.png`;

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-.758-.372-1.09-.494-.332-.122-.578-.184-.829.184-.25.367-.978 1.157-1.198 1.387-.22.23-.44.248-.829.062-.388-.184-1.644-.6-3.13-1.928-.962-.86-1.578-1.947-1.764-2.288-.186-.341-.02-.534.164-.717.166-.166.368-.423.553-.639.186-.216.248-.367.371-.613.123-.248.062-.463-.03-.613-.092-.15-1.09-2.625-1.498-3.593-.388-.93-.777-.798-1.059-.816-1.22-.092-2.109-.092-3.13.092-.516.092-1.09.248-1.644.816-.552.568-1.033 1.387-1.033 2.625 0 1.238.406 2.373.918 3.33.25.463 1.033 2.149 3.018 4.195 2.809 2.862 3.978 3.532 5.409 4.225.516.248.829.371 1.252.371.423 0 1.387-.184 1.576-1.498.184-1.312.184-2.438.123-2.625-.062-.184-.311-.248-.613-.371zm-5.408 7.39c-3.13-1.644-4.834-3.714-6.402-5.782-2.096-2.809-2.862-4.98-2.862-6.962 0-2.438 1.09-4.225 2.438-4.98 1.348-.763 2.809-.918 4.225-.371.918.311 1.498 1.439 1.764 2.149.266.717.406 1.498.123 2.149-.248.613-.552.978-1.033 1.498-.248.248-.371.463-.371.717 0 .248.123.463.311.613.854.854 2.149 1.644 3.714 2.223.248.092.463.123.613.03.248-.123.406-.248.613-.463.371-.482.613-.854.854-1.28.184-.367.423-.552.829-.463.406.092.918.463 1.252.829.332.367.552.717.552 1.157 0 .423-.184.978-.463 1.576-1.348 2.862-3.371 5.039-5.922 6.551-1.348.763-2.809.918-4.225.371z"/>
    </svg>
);

interface EventListItem {
  id: string;
  title: string;
  date: string;
  time?: string;
  description: string;
  image: string;
  isRecurring?: boolean;
  isCancelled?: boolean;
  isInstance?: boolean;
}

interface GroupPageData extends StoredGroupType {
  membersList: Array<{ id: string; name: string; avatar: string; isCreator: boolean; isAdmin?: boolean; }>;
  upcomingEventsList: EventListItem[];
  pastEventsList: EventListItem[];
  groupMessages: GroupMessage[];
}

interface TabDefinition {
  value: string;
  label: string | (() => string);
  icon: LucideIcon;
  condition: () => boolean;
  content: React.ReactNode;
}

const translations = {
  en: {
    loading: "Loading...",
    groupNotFound: "Group Not Found",
    groupIdNotFound: (groupId: string) => `Group ID "${groupId}" not found.`,
    back: "Back",
    privateGroup: "Private Group",
    requestToJoinPrivate: "This is a private group. Request to join.",
    loginToRequest: "This is a private group. Please log in or sign up to request access.",
    requestToJoinBtn: "Request to Join",
    requestPending: "Request Pending",
    joinGroup: "Join Group",
    editSettings: "Edit Settings",
    cancelEvent: "Cancel Event",
    reactivateEvent: "Reactivate Event",
    deleteEvent: "Delete Event",
    deleteSeries: "Delete Series",
    manageSeriesFromMaster: "To manage series, go to the master event settings.",
    upcomingEvents: "Upcoming Events",
    futureActivities: "Future activities.",
    newEvent: "New Event",
    noUpcomingEvents: "No upcoming events.",
    recurring: "Recurring",
    cancelled: "CANCELLED",
    viewEvent: "View Event",
    pastEvents: "Past Events",
    previousActivities: "Previous activities.",
    noPastEvents: "No past events.",
    archived: "Archived",
    viewDetails: "View Details",
    messages: "Messages",
    groupMessageBoard: "Group Message Board",
    startAConversation: "Start a conversation!",
    noMessagesYet: "No messages yet.",
    postMessage: "Post Message",
    posting: "Posting...",
    writeSomething: "Write something...",
    joinToParticipate: "Join this group to participate in the conversation.",
    members: (count: number) => `Members (${count})`,
    groupParticipants: "Group participants.",
    searchMembers: "Search members...",
    noMembersFound: (term: string) => term ? `No members found matching your search.` : "No members yet.",
    creator: "Creator",
    admin: "Admin",
    demoteAdmin: (name: string) => `Demote ${name} from Admin?`,
    demoteAdminDesc: "This will remove their admin privileges. Group creator cannot be demoted.",
    demote: "Demote",
    promoteAdmin: (name: string) => `Promote ${name} to Admin?`,
    promoteAdminDesc: "Admins can manage group settings, members, and events.",
    promote: "Promote",
    removeMember: (name: string) => `Remove ${name} from group?`,
    removeMemberDesc: "This will remove them from the group and they will lose access. Are you sure?",
    remove: "Remove",
    requests: (count: number) => `Requests (${count})`,
    manageRequests: "Manage pending requests to join this group.",
    noPendingRequests: "No pending requests.",
    requestedDatePrefix: "Requested",
    deny: "Deny",
    approve: "Approve",
    settings: "Settings",
    manageSettings: "Manage group details and privacy.",
    memberToViewSettings: "You must be a member to view or change settings.",
    adminToChangeSettings: "Only group admins can modify these settings.",
    nameLabel: "Name",
    descriptionLabel: "Description",
    imageLabel: "Group Image",
    visibilityLabel: "Visibility:",
    publicVisibility: "Public",
    privateVisibility: "Private",
    editSettingsBtn: "Edit Settings",
    publicGroupDesc: "Public Group (Visible to everyone)",
    privateGroupDesc: "Private Group (Members only)",
    saveChanges: "Save Changes",
    leaveGroup: "Leave Group",
    leaveGroupConfirm: (name: string) => `Leave Group "${name}"?`,
    leaveGroupDesc: "You will lose access to its content and events unless you rejoin. Are you sure?",
    deleteGroup: "Delete Group",
    deleteGroupConfirm: (name: string) => `Permanently Delete Group "${name}"?`,
    deleteGroupDesc: "This action cannot be undone. All group data, messages, and events will be lost.",
    deletePermanently: "Delete Permanently",
    toastActionNotAllowed: "Action Not Allowed",
    toastMissingInfo: "Missing required information to perform this action.",
    toastRequestAlreadyPending: "Request Already Pending",
    toastJoinedGroup: "Joined Group!",
    toastErrorJoining: "Error joining group",
    toastRequestSent: "Request Sent!",
    toastRequestSentDesc: (name: string) => `Your request to join "${name}" has been sent.`,
    toastErrorSendingRequest: "Error sending request",
    toastCouldNotSendRequest: "Could not send your join request.",
    toastCreatorCannotLeave: "Creator cannot leave",
    toastCreatorCannotLeaveDesc: "The group creator cannot leave the group. You can delete the group instead.",
    toastLeftGroup: "Left Group",
    toastErrorLeavingGroup: "Error leaving group",
    toastPermissionDenied: "Permission Denied",
    toastAdminOrCreatorDelete: "Only an admin, the creator, or the app owner can delete this group.",
    toastGroupDeleted: "Group Deleted",
    toastErrorDeletingGroup: "Error Deleting Group",
    toastCouldNotDeleteGroup: "Could not delete the group.",
    toastCannotRemoveCreator: "Cannot remove creator or self.",
    toastMemberRemoved: "Member Removed",
    toastErrorRemovingMember: "Error removing member",
    toastMemberApproved: "Member Approved",
    toastErrorApproving: "Error Al Aprobar Solicitud",
    toastRequestDenied: "Request Denied",
    toastErrorDenying: "Error Denying Request",
    toastGroupNameRequired: "Group name cannot be empty.",
    toastSettingsSaved: "Settings Saved",
    toastErrorSavingSettings: "Error Saving Settings",
    toastCouldNotSaveSettings: "Could not save group settings.",
    toastDemoteCreator: "Only the group creator can demote themselves (if other admins exist).",
    toastAdminPromoted: "Admin Promoted",
    toastErrorPromoting: "Error Promoting Member",
    toastAdminDemoted: "Admin Demoted",
    toastErrorDemoting: "Error Demoting Admin",
    toastMessagePosted: "Message Posted",
    toastErrorPostingMessage: "Error posting message",
    cancel: "Cancel",
    delete: "Delete",
    reportGroup: "Report Group",
    share: "Share",
    copyLink: "Copy Link",
    shareToWhatsApp: "Share to WhatsApp",
    toastLinkCopied: "Link Copied!",
    toastLinkCopiedDesc: "Group link has been copied to your clipboard.",
    login: "Login",
    you: "(You)",
  },
  es: {
    loading: "Cargando...",
    groupNotFound: "Grupo no Encontrado",
    groupIdNotFound: (groupId: string) => `El grupo con ID "${groupId}" no fue encontrado.`,
    back: "Volver",
    privateGroup: "Grupo Privado",
    requestToJoinPrivate: "Este es un grupo privado. Solicita unirte.",
    loginToRequest: "Este es un grupo privado. Por favor, inicia sesión o regístrate para solicitar acceso.",
    requestToJoinBtn: "Solicitar Unirse",
    requestPending: "Solicitud Pendiente",
    joinGroup: "Unirse al Grupo",
    editSettings: "Editar Ajustes",
    cancelEvent: "Cancelar Evento",
    reactivateEvent: "Reactivar Evento",
    deleteEvent: "Eliminar Evento",
    deleteSeries: "Eliminar Serie",
    manageSeriesFromMaster: "Para gestionar series, ve a los ajustes del evento principal.",
    upcomingEvents: "Próximos Eventos",
    futureActivities: "Actividades futuras.",
    newEvent: "Nuevo Evento",
    noUpcomingEvents: "No hay próximos eventos.",
    recurring: "Recurrente",
    cancelled: "CANCELADO",
    viewEvent: "Ver Evento",
    pastEvents: "Eventos Pasados",
    previousActivities: "Actividades anteriores.",
    noPastEvents: "No hay eventos pasados.",
    archived: "Archivado",
    viewDetails: "Ver Detalles",
    messages: "Mensajes",
    groupMessageBoard: "Tablón de Mensajes del Grupo",
    startAConversation: "¡Comienza una conversación!",
    noMessagesYet: "Aún no hay mensajes.",
    postMessage: "Publicar Mensaje",
    posting: "Publicando...",
    writeSomething: "Escribe algo...",
    joinToParticipate: "Únete a este grupo para participar en la conversación.",
    members: (count: number) => `Miembros (${count})`,
    groupParticipants: "Participantes del grupo.",
    searchMembers: "Buscar miembros...",
    noMembersFound: (term: string) => term ? `No se encontraron miembros para "${term}".` : "Aún no hay miembros.",
    creator: "Creador",
    admin: "Admin",
    demoteAdmin: (name: string) => `¿Degradar a ${name} de Admin?`,
    demoteAdminDesc: "Esto eliminará sus privilegios de administrador. El creador del grupo no puede ser degradado.",
    demote: "Degradar",
    promoteAdmin: (name: string) => `¿Promover a ${name} a Admin?`,
    promoteAdminDesc: "Los administradores pueden gestionar ajustes, miembros y eventos del grupo.",
    promote: "Promover",
    removeMember: (name: string) => `¿Eliminar a ${name} del grupo?`,
    removeMemberDesc: "Esto lo eliminará del grupo y perderá el acceso. ¿Estás seguro?",
    remove: "Eliminar",
    requests: (count: number) => `Solicitudes (${count})`,
    manageRequests: "Gestionar solicitudes pendientes para unirse a este grupo.",
    noPendingRequests: "No hay solicitudes pendientes.",
    requestedDatePrefix: "Solicitado",
    deny: "Rechazar",
    approve: "Aprobar",
    settings: "Ajustes",
    manageSettings: "Gestionar detalles y privacidad del grupo.",
    memberToViewSettings: "Debes ser miembro para ver o cambiar los ajustes.",
    adminToChangeSettings: "Solo los administradores del grupo pueden modificar estos ajustes.",
    nameLabel: "Nombre",
    descriptionLabel: "Descripción",
    imageLabel: "Imagen del Grupo",
    visibilityLabel: "Visibilidad:",
    publicVisibility: "Público",
    privateVisibility: "Privado",
    editSettingsBtn: "Editar Ajustes",
    publicGroupDesc: "Grupo Público (Visible para todos)",
    privateGroupDesc: "Grupo Privado (Solo para miembros)",
    saveChanges: "Guardar Cambios",
    leaveGroup: "Abandonar Grupo",
    leaveGroupConfirm: (name: string) => `¿Abandonar el grupo "${name}"?`,
    leaveGroupDesc: "Perderás el acceso a su contenido y eventos a menos que te unas de nuevo. ¿Estás seguro?",
    deleteGroup: "Eliminar Grupo",
    deleteGroupConfirm: (name: string) => `¿Eliminar permanentemente el grupo "${name}"?`,
    deleteGroupDesc: "Esta acción no se puede deshacer. Todos los datos, mensajes y eventos del grupo se perderán.",
    deletePermanently: "Eliminar Permanentemente",
    toastActionNotAllowed: "Acción no Permitida",
    toastMissingInfo: "Falta información requerida para realizar esta acción.",
    toastRequestAlreadyPending: "Solicitud ya pendiente",
    toastJoinedGroup: "¡Te has unido al grupo!",
    toastErrorJoining: "Error al unirse al grupo",
    toastRequestSent: "¡Solicitud Enviada!",
    toastRequestSentDesc: (name: string) => `Tu solicitud para unirte a "${name}" ha sido enviada.`,
    toastErrorSendingRequest: "Error al enviar solicitud",
    toastCouldNotSendRequest: "No se pudo enviar tu solicitud de unión.",
    toastCreatorCannotLeave: "El creador no puede abandonar",
    toastCreatorCannotLeaveDesc: "El creador del grupo no puede abandonar el grupo. Puedes eliminar el grupo en su lugar.",
    toastLeftGroup: "Has abandonado el grupo",
    toastErrorLeavingGroup: "Error al abandonar el grupo",
    toastPermissionDenied: "Permiso Denegado",
    toastAdminOrCreatorDelete: "Solo un administrador, el creador o el propietario de la aplicación pueden eliminar este grupo.",
    toastGroupDeleted: "Grupo Eliminado",
    toastErrorDeletingGroup: "Error al Eliminar el Grupo",
    toastCouldNotDeleteGroup: "No se pudo eliminar el grupo.",
    toastCannotRemoveCreator: "No se puede eliminar al creador o a ti mismo.",
    toastMemberRemoved: "Miembro Eliminado",
    toastErrorRemovingMember: "Error al eliminar miembro",
    toastMemberApproved: "Miembro Aprobado",
    toastErrorApproving: "Error al Aprobar Solicitud",
    toastRequestDenied: "Solicitud Rechazada",
    toastErrorDenying: "Error al Rechazar Solicitud",
    toastGroupNameRequired: "El nombre del grupo no puede estar vacío.",
    toastSettingsSaved: "Ajustes Guardados",
    toastErrorSavingSettings: "Error al Guardar los Ajustes",
    toastCouldNotSaveSettings: "No se pudieron guardar los ajustes del grupo.",
    toastDemoteCreator: "Solo el creador del grupo puede degradarse a sí mismo (si existen otros administradores).",
    toastAdminPromoted: "Admin Promovido",
    toastErrorPromoting: "Error al Promover Miembro",
    toastAdminDemoted: "Admin Degradado",
    toastErrorDemoting: "Error al Degradar Admin",
    toastMessagePosted: "Mensaje Publicado",
    toastErrorPostingMessage: "Error al publicar mensaje",
    cancel: "Cancelar",
    delete: "Eliminar",
    reportGroup: "Reportar Grupo",
    share: "Compartir",
    copyLink: "Copiar Enlace",
    shareToWhatsApp: "Compartir en WhatsApp",
    toastLinkCopied: "¡Enlace Copiado!",
    toastLinkCopiedDesc: "El enlace del grupo ha sido copiado a tu portapapeles.",
    login: "Iniciar Sesión",
    you: "(Tú)",
  }
};


export default function GroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const router = useRouter();

  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');
  
  const [currentGroupPageData, setCurrentGroupPageData] = useState<GroupPageData | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [displayedMemberCount, setDisplayedMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [hasPendingRequestForThisGroup, setHasPendingRequestForThisGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("upcoming_events");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [newGroupMessage, setNewGroupMessage] = useState("");
  const [isPostingMessage, setIsPostingMessage] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);


  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editableGroupName, setEditableGroupName] = useState("");
  const [editableGroupDescription, setEditableGroupDescription] = useState("");
  const [editableGroupIsPublic, setEditableGroupIsPublic] = useState(true);
  const [editableGroupImage, setEditableGroupImage] = useState<string | null>(null);
  const [settingsFormError, setSettingsFormError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialTabSet = useRef(false);

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split('-')[0] as 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru';
      if (translations[browserLang as keyof typeof translations]) {
        setLang(browserLang as any);
      }
    }
  }, []);

  const t = translations[lang] || translations['en'];

  useEffect(() => {
    if (currentGroupPageData) {
      document.title = `${currentGroupPageData.name} | GroupHub`;
    }
  }, [currentGroupPageData]);

  const fetchGroupAndRelatedData = useCallback(async () => {
    if (!groupId) { setLoadingGroup(false); setCurrentGroupPageData(null); return; }
    if (authLoading) { setLoadingGroup(true); return; }
    setLoadingGroup(true); 

    const foundStoredGroup = await getGroupById(groupId);

    if (!foundStoredGroup) {
      setCurrentGroupPageData(null);
      setLoadingGroup(false);
      return;
    }

    const currentUserId = currentUser?.uid;
    const userIsMember = !!currentUserId && foundStoredGroup.memberIds.includes(currentUserId);
    const userIsOwner = !!currentUserId && process.env.NEXT_PUBLIC_OWNER_UID === currentUserId;
    
    setIsMember(userIsMember);
    setDisplayedMemberCount(foundStoredGroup.memberIds.length);
    setIsOwner(userIsOwner);
    const userIsCreator = !!currentUserId && foundStoredGroup.creatorId === currentUserId;
    setIsCreator(userIsCreator);
    const effectiveAdminIds = new Set(foundStoredGroup.adminIds);
    if (foundStoredGroup.creatorId) effectiveAdminIds.add(foundStoredGroup.creatorId);
    const userIsAdmin = !!currentUserId && effectiveAdminIds.has(currentUserId);
    setIsAdmin(userIsAdmin);

    if (userIsAdmin && currentUserId) {
      const reqs = await S_getGroupJoinRequests(groupId, currentUserId);
      setJoinRequests(reqs);
    } else {
      setJoinRequests([]);
    }

    setEditableGroupName(foundStoredGroup.name);
    setEditableGroupDescription(foundStoredGroup.description || "");
    setEditableGroupIsPublic(foundStoredGroup.isPublic);

    const membersList: GroupPageData['membersList'] = [];
    if (foundStoredGroup.memberIds && foundStoredGroup.memberIds.length > 0) {
      const fetchedMemberDetailsMap = await S_getMultipleContactableUserDetails(foundStoredGroup.memberIds);
      foundStoredGroup.memberIds.forEach(id => {
        const userDetailFromServer = fetchedMemberDetailsMap[id];
        const name = (currentUser && id === currentUser.uid) ?
          (currentUser.displayName || currentUser.email?.split('@')[0] || t.you) :
          userDetailFromServer?.name || `User ${id.substring(0, 4)}`;
        const avatar = (currentUser && id === currentUser.uid && currentUser.photoURL) ?
          currentUser.photoURL :
          userDetailFromServer?.avatar || getDefaultVercelAvatar(id);
        membersList.push({ id, name, avatar, isCreator: id === foundStoredGroup.creatorId, isAdmin: effectiveAdminIds.has(id) });
      });
    }

    let groupUpcomingEventsRaw: FullEventData[] = [];
    let groupPastEventsRaw: FullEventData[] = [];
    try {
      const masterEventsForGroup = await S_getEventsForGroup(groupId);

      const today = startOfDay(new Date());
      const rangeStart = subMonths(today, 12);
      const rangeEnd = addMonths(today, 12);

      masterEventsForGroup.forEach(masterEvent => {
        const mappedMasterEvent: FullEventData = {
          ...masterEvent,
          id: masterEvent.id || `event-${Date.now()}`,
          name: masterEvent.name || "Unnamed Event",
          date: typeof masterEvent.date === 'string' ? masterEvent.date : (masterEvent.date ? new Date(masterEvent.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          time: typeof masterEvent.time === 'string' ? masterEvent.time : (masterEvent.time || undefined),
          location: masterEvent.location || "Not specified",
          groupId: masterEvent.groupId || "unknown_group",
          group: masterEvent.group || "Unknown Group",
          description: masterEvent.description || "No description provided.",
          image: typeof masterEvent.image === 'string' && masterEvent.image.trim() !== '' ? masterEvent.image : DEFAULT_EVENT_IMAGE,
          attendees: Array.isArray(masterEvent.attendees) ? masterEvent.attendees : [],
          isRecurring: typeof masterEvent.isRecurring === 'boolean' ? masterEvent.isRecurring : false,
          recurrence: masterEvent.recurrence || undefined,
          isCancelled: typeof masterEvent.isCancelled === 'boolean' ? masterEvent.isCancelled : false,
          instanceAttendees: masterEvent.instanceAttendees || {},
          instanceMetadata: masterEvent.instanceMetadata || {},
        };

        if (mappedMasterEvent.isCancelled && !mappedMasterEvent.isInstance) return;

        if (mappedMasterEvent.isRecurring && mappedMasterEvent.recurrence && !mappedMasterEvent.isInstance) {
          const instances = generateEventOccurrences(mappedMasterEvent, rangeStart, rangeEnd);
          instances.forEach(instance => {
            const instanceDateStr = formatISO(parseISO(instance.date), { representation: 'date' });
            const isInstanceEffectivelyCancelled = mappedMasterEvent.instanceMetadata?.[instanceDateStr]?.isCancelled ?? mappedMasterEvent.isCancelled ?? false;

            if (!isInstanceEffectivelyCancelled) {
              if (isEventInstancePast(instance.date)) { groupPastEventsRaw.push(instance); } else { groupUpcomingEventsRaw.push(instance); }
            }
          });
        } else if (!mappedMasterEvent.isInstance) {
          if (!mappedMasterEvent.isCancelled) {
            if (isEventInstancePast(mappedMasterEvent.date)) {
              groupPastEventsRaw.push(mappedMasterEvent);
            } else {
              groupUpcomingEventsRaw.push(mappedMasterEvent);
            }
          }
        }
      });
    } catch (e) { console.error("Error loading/processing events from server action:", e); }

    const mapToListItem = (event: FullEventData): EventListItem => ({
      id: event.id,
      title: event.name,
      date: event.date,
      time: event.time,
      description: event.description || "No description.",
      image: event.image || DEFAULT_EVENT_IMAGE,
      isRecurring: event.isInstance || event.isRecurring,
      isCancelled: event.isCancelled,
      isInstance: event.isInstance,
    });

    // Modified for organic traffic: messages are now publicly visible (read-only)
    const groupMessages = await S_getMessagesForGroup(groupId);

    setCurrentGroupPageData({
      ...foundStoredGroup,
      adminIds: Array.from(effectiveAdminIds),
      membersList,
      upcomingEventsList: groupUpcomingEventsRaw.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(mapToListItem),
      pastEventsList: groupPastEventsRaw.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(mapToListItem),
      groupMessages: groupMessages,
    });

    setLoadingGroup(false);
  }, [groupId, currentUser, authLoading, t]);

  useEffect(() => { fetchGroupAndRelatedData(); }, [fetchGroupAndRelatedData]);

  useEffect(() => {
    if (initialTabSet.current || !currentGroupPageData || loadingGroup) {
      return;
    }

    const hasUpcomingEvents = currentGroupPageData.upcomingEventsList.length > 0;
    const userIsMember = !!currentUser && currentGroupPageData.memberIds.includes(currentUser.uid);

    if (!hasUpcomingEvents && userIsMember) {
      setActiveTab("messages");
    } else {
      setActiveTab("upcoming_events");
    }
    initialTabSet.current = true;
  }, [currentGroupPageData, loadingGroup, currentUser]);

  useEffect(() => {
    if (activeTab === 'messages' && currentGroupPageData) {
        // Mark as read when entering messages tab
        localStorage.setItem(`${GROUP_LAST_READ_PREFIX}${currentGroupPageData.id}`, new Date().toISOString());
        dispatchStorageUpdatedEvent();

        // Use a timeout to ensure the view has rendered before scrolling, especially on tab switch
        setTimeout(() => {
            scrollToBottom('auto');
        }, 100);
    }
  }, [activeTab, currentGroupPageData]);

  const handleJoinPublicGroup = async () => {
    if (!currentUser || !currentGroupPageData || !currentGroupPageData.isPublic || isMember) return;
    const result = await S_joinGroup(currentGroupPageData.id, currentUser.uid);
    if (result.success) {
      toast({ title: t.toastJoinedGroup});
      fetchGroupAndRelatedData(); 
      dispatchStorageUpdatedEvent();
    } else {
      toast({ title: t.toastErrorJoining, description: result.message, variant: "destructive" });
    }
  };

  const handleRequestToJoinPrivateGroup = async () => {
    if (!currentUser || !currentGroupPageData || currentGroupPageData.isPublic || isMember || hasPendingRequestForThisGroup) {
        if(hasPendingRequestForThisGroup) toast({title: t.toastRequestAlreadyPending}); return; 
    }
    const result = await S_requestToJoinGroup(
        currentGroupPageData.id, 
        currentUser.uid,
        currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        currentUser.photoURL || getDefaultVercelAvatar(currentUser.email || currentUser.uid)
    );
    if (result.success) {
        setHasPendingRequestForThisGroup(true); 
        toast({title: t.toastRequestSent});
        dispatchStorageUpdatedEvent();
    } else {
        toast({title: t.toastErrorSendingRequest, description: result.message, variant: "destructive"});
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUser || !currentGroupPageData || !isMember || isCreator) {
        if(isCreator) toast({ title: t.toastCreatorCannotLeave, description: t.toastCreatorCannotLeaveDesc, variant: "destructive" }); return; 
    }
    const result = await S_leaveGroup(currentGroupPageData.id, currentUser.uid);
    if (result.success) {
        toast({ title: t.toastLeftGroup }); 
        fetchGroupAndRelatedData(); 
        dispatchStorageUpdatedEvent();
        if (currentGroupPageData.isPublic === false) {
            router.push('/groups'); 
        }
    } else {
        toast({ title: t.toastErrorLeavingGroup, description: result.message, variant: "destructive" });
    }
  };

  const handleDeleteGroup = async () => {
    if (!currentUser || !currentGroupPageData || (!isAdmin && !isCreator && !isOwner) ) {
        toast({ title: t.toastPermissionDenied, description: t.toastAdminOrCreatorDelete, variant: "destructive"}); return; 
    }
    const result = await S_deleteGroup(currentGroupPageData.id, currentUser.uid);
    if (result.success) {
        toast({ title: t.toastGroupDeleted}); router.push("/groups");
        dispatchStorageUpdatedEvent();
    } else {
        toast({ title: t.toastErrorDeletingGroup, description: result.message || t.toastCouldNotDeleteGroup, variant: "destructive"});
    }
  };

  const handleRemoveMember = async (memberIdToRemove: string) => {
    if (!currentUser || !currentGroupPageData || !isAdmin || memberIdToRemove === currentGroupPageData.creatorId || memberIdToRemove === currentUser.uid) {
      toast({ title: t.toastActionNotAllowed, description: t.toastCannotRemoveCreator, variant: "destructive" }); return; 
    }
    const result = await S_removeMemberFromGroup(currentGroupPageData.id, memberIdToRemove, currentUser.uid);
    if (result.success) {
        toast({ title: t.toastMemberRemoved }); 
        fetchGroupAndRelatedData();
        dispatchStorageUpdatedEvent();
    } else {
        toast({ title: t.toastErrorRemovingMember, description: result.message, variant: "destructive" });
    }
  };

  const handleApproveRequest = async (reqToApprove: GroupJoinRequest) => {
    if (!currentUser || !currentGroupPageData || !isAdmin) return;
    const result = await S_approveGroupJoinRequest(reqToApprove.id, currentUser.uid);
    if (result.success) {
        toast({ title: t.toastMemberApproved }); 
        fetchGroupAndRelatedData();
        dispatchStorageUpdatedEvent();
    } else {
        toast({ title: t.toastErrorApproving, description: result.message, variant: "destructive" });
    }
  };

  const handleDenyRequest = async (reqIdToDeny: string) => {
      if (!currentUser || !currentGroupPageData || !isAdmin) return;
      const result = await S_denyGroupJoinRequest(reqIdToDeny, currentUser.uid);
      if (result.success) {
          toast({ title: t.toastRequestDenied }); 
          setJoinRequests(prev => prev.filter(r => r.id !== reqIdToDeny)); 
          dispatchStorageUpdatedEvent();
      } else {
          toast({ title: t.toastErrorDenying, description: result.message, variant: "destructive" });
      }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditableGroupImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleEditSettings = () => {
    if (currentGroupPageData && isAdmin) {
        setIsEditingSettings(true);
        setSettingsFormError(null);
        setEditableGroupName(currentGroupPageData.name);
        setEditableGroupDescription(currentGroupPageData.description || "");
        setEditableGroupIsPublic(currentGroupPageData.isPublic);
        setEditableGroupImage(currentGroupPageData.image || null);
    }
  };
  const handleCancelEditSettings = () => {
    setIsEditingSettings(false);
    setSettingsFormError(null);
  };

  const handleSaveSettings = async () => {
    if (!currentUser || !currentGroupPageData || !isAdmin) return;
    setSettingsFormError(null);
    if (!editableGroupName.trim()) { setSettingsFormError(t.toastGroupNameRequired); return; }

    const updatedData = {
        name: editableGroupName,
        description: editableGroupDescription,
        isPublic: editableGroupIsPublic,
        image: editableGroupImage,
    };

    const result = await updateGroupSettings(currentGroupPageData.id, updatedData, currentUser.uid);

    if (result.success && result.updatedGroup) {
        setIsEditingSettings(false);
        toast({ title: t.toastSettingsSaved });
        fetchGroupAndRelatedData(); 
        dispatchStorageUpdatedEvent();
    } else {
      const errorMsg = result.message || t.toastCouldNotSaveSettings;
        setSettingsFormError(errorMsg);
        toast({ title: t.toastErrorSavingSettings, description: errorMsg, variant: "destructive" });
    }
  };

  const handlePromoteToAdmin = async (memberId: string) => {
    if (!currentUser || !currentGroupPageData || !isAdmin) return;
    const result = await S_promoteToAdmin(currentGroupPageData.id, memberId, currentUser.uid);
    if (result.success) {
        toast({title: t.toastAdminPromoted}); 
        fetchGroupAndRelatedData();
        dispatchStorageUpdatedEvent();
    } else {
        toast({title:t.toastErrorPromoting, description: result.message, variant: "destructive"});
    }
  };
  const handleDemoteFromAdmin = async (memberId: string) => {
    if (!currentUser || !currentGroupPageData || !isAdmin) return;
    if (memberId === currentGroupPageData.creatorId && currentUser.uid !== currentGroupPageData.creatorId) {
      toast({ title: t.toastActionNotAllowed, description: t.toastDemoteCreator, variant: "destructive" }); return;
    }
    const result = await S_demoteFromAdmin(currentGroupPageData.id, memberId, currentUser.uid);
    if (result.success) {
        toast({title: t.toastAdminDemoted}); 
        fetchGroupAndRelatedData();
        dispatchStorageUpdatedEvent();
    } else {
        toast({title:t.toastErrorDemoting, description: result.message, variant: "destructive"});
    }
  };
  
  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupMessage.trim() || !currentUser || !currentGroupPageData) return;

    setIsPostingMessage(true);

    const result = await S_postMessageToGroup({
        groupId: currentGroupPageData.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "User",
        senderAvatar: currentUser.photoURL || undefined,
        text: newGroupMessage,
    });
    
    if (result.success && result.groupMessage) {
        setCurrentGroupPageData(prev => prev ? ({ ...prev, groupMessages: [...prev.groupMessages, result.groupMessage!] }) : null);
        setNewGroupMessage("");
        toast({ title: t.toastMessagePosted });
        
        // Update last read since we just posted
        localStorage.setItem(`${GROUP_LAST_READ_PREFIX}${currentGroupPageData.id}`, new Date().toISOString());
        dispatchStorageUpdatedEvent();
    } else {
        toast({ title: t.toastErrorPostingMessage, description: result.message, variant: "destructive" });
    }

    setIsPostingMessage(false);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: t.toastLinkCopied, description: t.toastLinkCopiedDesc });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({ title: "Error", description: "Could not copy link.", variant: "destructive" });
    });
  };
  
  const handleShareToWhatsApp = () => {
    if (!currentGroupPageData) return;
    const groupName = currentGroupPageData.name;
    const url = window.location.href;
    const text = encodeURIComponent(`Check out this group on GroupHub: "${groupName}"\n\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };


  if (loadingGroup || authLoading) { return <PageShell title={t.loading}><Skeleton className="h-96 w-full" /></PageShell>; }
  if (!currentGroupPageData) { return <PageShell title={t.groupNotFound}><Card><CardHeader><AlertTriangle className="text-destructive mx-auto h-12 w-12" /><CardTitle>Not Found</CardTitle><CardDescription>{t.groupIdNotFound(groupId)}</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href="/groups"><ArrowLeft/> {t.back}</Link></Button></CardContent></Card></PageShell>; }

  const createEventHref = `/events/create?groupId=${currentGroupPageData.id}&groupName=${encodeURIComponent(currentGroupPageData.name)}`;
  const filteredMembers = currentGroupPageData.membersList.filter(m => m.name.toLowerCase().includes(memberSearchTerm.toLowerCase()));

  const visibleTabs: TabDefinition[] = [
    { value: "upcoming_events", label: t.upcomingEvents, icon: CalendarDays, condition: () => true, content: (
       <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>{t.upcomingEvents}</CardTitle><CardDescription>{t.futureActivities}</CardDescription></div>{currentUser && isAdmin && (<Button size="sm" variant="outline" asChild><Link href={createEventHref}><PlusCircle className="w-4 h-4 mr-2"/>{t.newEvent}</Link></Button>)}</CardHeader><CardContent className="space-y-4">
         {currentGroupPageData.upcomingEventsList.length === 0 && <p className="text-muted-foreground text-center py-4">{t.noUpcomingEvents}</p>}
         {currentGroupPageData.upcomingEventsList.map(event => (
            <Link href={`/events/${event.id}`} passHref legacyBehavior key={event.id}><a className="block"><Card className={`hover:shadow-md ${event.isCancelled ? 'opacity-60' : ''}`}><CardHeader className="flex flex-row items-center gap-4 p-4"><Avatar className="w-12 h-12 border"><AvatarImage src={event.image} alt={event.title}/><AvatarFallback>{event.title.charAt(0)}</AvatarFallback></Avatar><div><CardTitle className="text-lg">{event.title}</CardTitle><p className="text-xs text-muted-foreground">{format(new Date(event.date + 'T00:00:00Z'), 'PP')}</p></div></CardHeader><CardContent className="pt-0 p-4"><p className="text-sm line-clamp-2">{event.description}</p></CardContent><CardFooter className="p-4 pt-0"><Button size="sm" variant="outline" className="w-full" disabled={event.isCancelled}>{t.viewEvent}</Button></CardFooter></Card></a></Link>
         ))}
       </CardContent></Card>
    )},
    { value: "messages", label: t.messages, icon: MessageSquare, condition: () => true, content: (
        <Card>
            <CardHeader>
                <CardTitle>{t.groupMessageBoard}</CardTitle>
                <CardDescription>{t.startAConversation}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col h-[60vh]">
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                            {currentGroupPageData.groupMessages.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">{t.noMessagesYet}</p>
                            ) : (
                                currentGroupPageData.groupMessages.map(msg => (
                                    <div key={msg.id} className="flex items-start gap-3">
                                        <Link href={`/profile/${msg.senderId}`} className="shrink-0">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={msg.senderAvatar} />
                                                <AvatarFallback>{msg.senderName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </Link>
                                        <div>
                                            <div className="flex items-baseline gap-2">
                                                <Link href={`/profile/${msg.senderId}`}>
                                                    <p className="font-semibold text-sm hover:underline">{msg.senderName}</p>
                                                </Link>
                                                <p className="text-xs text-muted-foreground"><TimeAgo dateString={msg.timestamp}/></p>
                                            </div>
                                            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="my-0" {...props} />,
                                                        a: ({node, ...props}) => <a className="text-primary hover:underline not-prose" {...props} />
                                                    }}
                                                >
                                                    {msg.text}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>
                    <div className="pt-4 mt-4 border-t">
                        {isMember ? (
                            <form onSubmit={handlePostMessage} className="flex items-start gap-2">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={currentUser?.photoURL || undefined} />
                                    <AvatarFallback>{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <Textarea
                                    placeholder={t.writeSomething}
                                    value={newGroupMessage}
                                    onChange={(e) => setNewGroupMessage(e.target.value)}
                                    className="flex-1"
                                    rows={1}
                                />
                                <Button type="submit" disabled={isPostingMessage || !newGroupMessage.trim()}>
                                    {isPostingMessage ? t.posting : t.postMessage}
                                </Button>
                            </form>
                        ) : (
                            <div className="bg-muted p-4 rounded-md text-center border border-dashed">
                                <p className="text-sm text-muted-foreground mb-3">{t.joinToParticipate}</p>
                                {currentUser ? (
                                    currentGroupPageData.isPublic ? (
                                        <Button onClick={handleJoinPublicGroup} size="sm"><UserPlus className="mr-2 h-4 w-4"/> {t.joinGroup}</Button>
                                    ) : (
                                        <Button onClick={handleRequestToJoinPrivateGroup} size="sm" disabled={hasPendingRequestForThisGroup}>
                                            {hasPendingRequestForThisGroup ? <Hourglass className="mr-2 h-4 w-4"/> : <Send className="mr-2 h-4 w-4"/>}
                                            {hasPendingRequestForThisGroup ? t.requestPending : t.requestToJoinBtn}
                                        </Button>
                                    )
                                ) : (
                                    <Button asChild size="sm">
                                        <Link href={`/login?redirect=/groups/${currentGroupPageData.id}`}>
                                            <LogIn className="mr-2 h-4 w-4"/> {t.login}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )},
    { value: "past_events", label: t.pastEvents, icon: Archive, condition: () => true, content: (
       <Card><CardHeader><CardTitle>{t.pastEvents}</CardTitle><CardDescription>{t.previousActivities}</CardDescription></CardHeader><CardContent className="space-y-4">
         {currentGroupPageData.pastEventsList.length === 0 && <p className="text-muted-foreground text-center py-4">{t.noPastEvents}</p>}
         {currentGroupPageData.pastEventsList.map(event => (
            <Link href={`/events/${event.id}`} passHref legacyBehavior key={event.id}><a className="block"><Card className={`opacity-75 hover:opacity-100 ${event.isCancelled ? 'border-destructive/50' : ''}`}><CardHeader className="flex flex-row items-center gap-4 p-4"><Avatar className="w-12 h-12 border"><AvatarImage src={event.image} alt={event.title}/><AvatarFallback>{event.title.charAt(0)}</AvatarFallback></Avatar><div><CardTitle className="text-lg">{event.title}</CardTitle><p className="text-xs text-muted-foreground">{format(new Date(event.date + 'T00:00:00Z'), 'PP')}{event.time ? ` at ${event.time}`:''}</p></div></CardHeader><CardContent className="pt-0 p-4"><p className="text-sm line-clamp-2">{event.description}</p></CardContent><CardFooter className="p-4 pt-0"><Button size="sm" variant="outline" className="w-full">{t.viewDetails}</Button></CardFooter></Card></a></Link>
         ))}
       </CardContent></Card>
    )},
    { value: "members", label: () => t.members(displayedMemberCount), icon: Users, condition: () => true, content: (
      <Card><CardHeader><CardTitle>{t.members(displayedMemberCount)}</CardTitle><CardDescription>{t.groupParticipants}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="relative mb-4"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input placeholder={t.searchMembers} className="pl-8" value={memberSearchTerm} onChange={e => setMemberSearchTerm(e.target.value)}/></div><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredMembers.length === 0 && <p className="text-muted-foreground text-center py-4 col-span-full">{t.noMembersFound(memberSearchTerm)}</p>}
        {filteredMembers.map(member => (<Card key={member.id} className="bg-secondary/30 p-3"><div className="flex items-center justify-between"><Link href={`/profile/${member.id}`} passHref legacyBehavior><a className="flex items-center gap-2 flex-1 min-w-0"><Avatar className="h-9 w-9 shrink-0"><AvatarImage src={member.avatar}/><AvatarFallback>{member.name[0]}</AvatarFallback></Avatar><div className="min-w-0"><p className="font-medium text-sm truncate">{member.name}</p>{member.isCreator ? <span className="text-xs text-primary">{t.creator}</span> : member.isAdmin ? <span className="text-xs text-accent">{t.admin}</span> : null}</div></a></Link>
        {isAdmin && currentUser && member.id !== currentUser.uid && !member.isCreator && (<div className="flex gap-0.5 ml-1 shrink-0">{!member.isAdmin ? (<AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><ShieldCheck className="h-3.5 w-3.5 text-green-600"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t.promoteAdmin(member.name)}</AlertDialogTitle><AlertDialogDescription>{t.promoteAdminDesc}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={()=>handlePromoteToAdmin(member.id)} className="bg-green-600 hover:bg-green-700">{t.promote}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>) : (<AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><ShieldMinus className="h-3.5 w-3.5 text-orange-500"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t.demoteAdmin(member.name)}</AlertDialogTitle><AlertDialogDescription>{t.demoteAdminDesc}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={()=>handleDemoteFromAdmin(member.id)} className="bg-orange-500 hover:bg-orange-600">{t.demote}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}<AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><UserX className="h-3.5 w-3.5 text-destructive"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t.removeMember(member.name)}</AlertDialogTitle><AlertDialogDescription>{t.removeMemberDesc}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={()=>handleRemoveMember(member.id)} className="bg-destructive hover:bg-destructive/90">{t.remove}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>)}
        </div></Card>))}
      </div></CardContent></Card>
    )},
    { value: "requests", label: () => t.requests(joinRequests.length), icon: MailWarning, condition: () => isAdmin && (joinRequests.length > 0 || !isEditingSettings), content: (
      <Card><CardHeader><CardTitle>{t.requests(joinRequests.length)}</CardTitle><CardDescription>{t.manageRequests}</CardDescription></CardHeader><CardContent className="space-y-3">
        {joinRequests.length === 0 && <p className="text-muted-foreground text-center py-4">{t.noPendingRequests}</p>}
        {joinRequests.map(req => (<Card key={req.id} className="bg-secondary/30 p-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Avatar className="h-9 w-9"><AvatarImage src={req.userAvatar}/><AvatarFallback>{req.userName[0]}</AvatarFallback></Avatar><div><p className="font-medium text-sm">{req.userName}</p><p className="text-xs text-muted-foreground">{t.requestedDatePrefix}: <TimeAgo dateString={req.timestamp}/></p></div></div><div className="flex gap-1.5"><Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white" onClick={()=>handleDenyRequest(req.id)}><XCircle className="h-4 w-4 mr-1"/>{t.deny}</Button><Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={()=>handleApproveRequest(req)}><CheckCircle className="h-4 w-4 mr-1"/>{t.approve}</Button></div></div></Card>))}
      </CardContent></Card>
    )},
    { value: "settings", label: t.settings, icon: Settings, condition: () => true, content: (
      <Card><CardHeader><CardTitle>{t.settings}</CardTitle><CardDescription>{t.manageSettings}</CardDescription></CardHeader><CardContent className="space-y-4">
      {!currentUser || !isMember ? (<p className="text-muted-foreground">{currentGroupPageData.isPublic && currentUser ? <Button variant="link" onClick={handleJoinPublicGroup}>{t.joinGroup}</Button> : t.memberToViewSettings}</p>)
      : !isAdmin ? (<p className="text-muted-foreground">{t.adminToChangeSettings}</p>)
      : isEditingSettings ? (<form onSubmit={e=>{e.preventDefault(); handleSaveSettings();}} className="space-y-4">
          <div className="space-y-1"><Label htmlFor="gName">{t.nameLabel}</Label><Input id="gName" value={editableGroupName} onChange={e=>setEditableGroupName(e.target.value)}/></div>
          <div className="space-y-1"><Label htmlFor="gDesc">{t.descriptionLabel}</Label><Textarea id="gDesc" value={editableGroupDescription} onChange={e=>setEditableGroupDescription(e.target.value)}/></div>
          <div className="space-y-1">
            <Label htmlFor="gImage">{t.imageLabel}</Label>
            <Input id="gImage" type="file" accept="image/*" onChange={handleImageChange} />
          </div>
          <div className="flex items-center gap-2 pt-2"><Switch id="gPublic" checked={editableGroupIsPublic} onCheckedChange={setEditableGroupIsPublic}/><Label htmlFor="gPublic" className="cursor-pointer">{editableGroupIsPublic ? t.publicGroupDesc : t.privateGroupDesc}</Label></div>
          {settingsFormError && <p className="text-xs text-destructive">{settingsFormError}</p>}
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" type="button" onClick={handleCancelEditSettings}>{t.cancel}</Button><Button type="submit">{t.saveChanges}</Button></div>
          </form>)
      : (<div className="space-y-3"><p><strong>{t.nameLabel}:</strong> {currentGroupPageData.name}</p><p><strong>{t.descriptionLabel}:</strong> {currentGroupPageData.description || "No description provided."}</p><p><strong>{t.visibilityLabel}</strong> {currentGroupPageData.isPublic ? t.publicVisibility : t.privateVisibility}</p><Button onClick={handleToggleEditSettings}><Edit3 className="mr-2 h-4"/>{t.editSettingsBtn}</Button></div>)}
      <Separator className="my-6"/>
      {!isCreator && isMember && currentUser && (<AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" className="w-full sm:w-auto"><LogOut className="mr-2"/>{t.leaveGroup}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t.leaveGroupConfirm(currentGroupPageData.name)}</AlertDialogTitle><AlertDialogDescription>{t.leaveGroupDesc}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleLeaveGroup} className="bg-destructive hover:bg-destructive/90">{t.leaveGroup}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
      {(isCreator || isOwner) && currentUser && (<AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" className="w-full sm:w-auto bg-red-700 hover:bg-red-800"><ShieldAlert className="mr-2"/>{t.deleteGroup}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t.deleteGroupConfirm(currentGroupPageData.name)}</AlertDialogTitle><AlertDialogDescription>{t.deleteGroupDesc}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteGroup} className="bg-red-700 hover:bg-red-800">{t.deletePermanently}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
      </CardContent></Card>
    )},
  ].filter(tab => tab.condition());

  return (
    <PageShell>
        <Card className="overflow-hidden shadow-xl rounded-lg">
            <div className="p-4 md:p-6 bg-card border-b">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Avatar className="h-16 w-16 md:h-20 md:w-20 border">
                            <AvatarImage src={currentGroupPageData.image} alt={currentGroupPageData.name} />
                            <AvatarFallback>{currentGroupPageData.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                {isOwner && <Crown className="h-7 w-7 text-yellow-400 drop-shadow-lg" />}
                                <h1 className="font-headline text-3xl md:text-4xl font-bold text-foreground truncate">{currentGroupPageData.name}</h1>
                            </div>
                            <p className="text-sm text-muted-foreground max-w-xl line-clamp-2 mt-1">{currentGroupPageData.description}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center mt-2 sm:mt-0 sm:ml-4 shrink-0">
                        {currentUser && !isMember && (
                            currentGroupPageData.isPublic ? (
                                <Button onClick={handleJoinPublicGroup} className="bg-accent hover:bg-accent/90"><UserPlus className="mr-2"/>{t.joinGroup}</Button>
                            ) : (
                                <Button onClick={handleRequestToJoinPrivateGroup} variant="outline" disabled={hasPendingRequestForThisGroup}>
                                    {hasPendingRequestForThisGroup ? <Hourglass className="mr-2 h-4 w-4"/> : <Send className="mr-2 h-4 w-4"/>}
                                    {hasPendingRequestForThisGroup ? t.requestPending : t.requestToJoinBtn}
                                </Button>
                            )
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline"><Share2 className="mr-2 h-4 w-4" /> {t.share}</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={handleCopyLink} className="cursor-pointer">
                                    <Copy className="mr-2 h-4 w-4" />
                                    <span>{t.copyLink}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={handleShareToWhatsApp} className="cursor-pointer">
                                    <WhatsAppIcon className="mr-2 h-4 w-4" />
                                    <span>{t.shareToWhatsApp}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {currentUser && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon"><MoreHorizontal /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setReportDialogOpen(true)}>
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        <span>{t.reportGroup}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-2 md:p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="w-full overflow-x-auto mb-4 no-scrollbar"><TabsList className="inline-flex justify-start whitespace-nowrap">
                    {visibleTabs.map(tab => (<TabsTrigger key={tab.value} value={tab.value} className="px-3 py-1.5 flex items-center gap-2"><tab.icon className="w-4 h-4 shrink-0"/>{activeTab === tab.value && (<span className="truncate">{typeof tab.label === 'function' ? tab.label() : tab.label}</span>)}</TabsTrigger>))}
                </TabsList></div>
                {visibleTabs.map(tab => (<TabsContent key={tab.value} value={tab.value}>{tab.content}</TabsContent>))}
            </Tabs>
            </div>
        </Card>
        {currentUser && (
          <ReportDialog 
            open={reportDialogOpen} 
            onOpenChange={setReportDialogOpen}
            entityId={currentGroupPageData.id} 
            entityType="group" 
            entityLink={`/groups/${currentGroupPageData.id}`}
          >
            <></>
          </ReportDialog>
        )}
    </PageShell>
  );
}
