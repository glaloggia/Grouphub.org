
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, MapPin, Users, ArrowLeft, AlertTriangle, Loader2, CheckCircle, UserPlus, UserCheck, Info, Users2, ShieldQuestion, LockIcon, Edit3, Trash2, Archive, RotateCcw, XCircle, CheckSquare, Clock, MoreHorizontal, LogIn, Share2, Copy } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Event as StoredEvent, Group as StoredGroupInfo, ContactableUser } from "@/types"; 
import { isEventInstancePast as isDatePast } from "@/lib/event-utils"; 
import { getMasterEventById, updateMasterEvent, deleteMasterEvent } from '@/actions/event-actions';
import { getGroupById, S_joinGroupAndRsvpToEvent } from '@/actions/group-actions';
import { S_getMultipleContactableUserDetails } from '@/actions/user-profile-actions';
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";
import { ReportDialog } from "@/components/shared/ReportDialog";
import { format, formatDistanceToNow } from "date-fns";

interface Event extends StoredEvent {} // For local type consistency

const DEFAULT_EVENT_IMAGE = "https://placehold.co/600x400.png";
const isDynamicImage = (url: string) => url.startsWith('data:image') || !url.startsWith('https://placehold.co');
const getDefaultVercelAvatar = (identifier: string | null | undefined) => `https://avatar.vercel.sh/${identifier || 'default'}.png`;

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-.758-.372-1.09-.494-.332-.122-.578-.184-.829.184-.25.367-.978 1.157-1.198 1.387-.22.23-.44.248-.829.062-.388-.184-1.644-.6-3.13-1.928-.962-.86-1.578-1.947-1.764-2.288-.186-.341-.02-.534.164-.717.166-.166.368-.423.553-.639.186-.216.248-.367.371-.613.123-.248.062-.463-.03-.613-.092-.15-1.09-2.625-1.498-3.593-.388-.93-.777-.798-1.059-.816-1.22-.092-2.109-.092-3.13.092-.516.092-1.09.248-1.644.816-.552.568-1.033 1.387-1.033 2.625 0 1.238.406 2.373.918 3.33.25.463 1.033 2.149 3.018 4.195 2.809 2.862 3.978 3.532 5.409 4.225.516.248.829.371 1.252.371.423 0 1.387-.184 1.576-1.498.184-1.312.184-2.438.123-2.625-.062-.184-.311-.248-.613-.371zm-5.408 7.39c-3.13-1.644-4.834-3.714-6.402-5.782-2.096-2.809-2.862-4.98-2.862-6.962 0-2.438 1.09-4.225 2.438-4.98 1.348-.763 2.809-.918 4.225-.371.918.311 1.498 1.439 1.764 2.149.266.717.406 1.498.123 2.149-.248.613-.552.978-1.033 1.498-.248.248-.371.463-.371.717 0 .248.123.463.311.613.854.854 2.149 1.644 3.714 2.223.248.092.463.123.613.03.248-.123.406-.248.613-.463.371-.482.613-.854.854-1.28.184-.367.423-.552.829-.463.406.092.918.463 1.252.829.332.367.552.717.552 1.157 0 .423-.184.978-.463 1.576-1.348 2.862-3.371 5.039-5.922 6.551-1.348.763-2.809.918-4.225.371z"/>
    </svg>
);

const translations = {
  en: {
    loading: "Loading Event Details...",
    pleaseWait: "Please wait.",
    accessDenied: "Access Denied",
    cannotEdit: "Cannot edit this event.",
    eventNotFound: "Event not found. It might have been moved or deleted.",
    permissionDenied: "Permission Denied",
    groupNotFound: "The group that hosts this event could not be found.",
    adminRequiredToEdit: (name: string) => `You must be an admin/creator of "${name}" to edit this event.`,
    privateMemberView: "This event is part of a private group. You must be a member to view it.",
    privateLoginView: "This event is part of a private group. Please log in.",
    errorLoading: "Error Loading Event",
    couldNotLoad: "Could not load event data.",
    eventNotFoundTitle: "Event Not Found",
    sorryNotFound: "Sorry, we couldn't find the event.",
    oopsMissing: "Oops! Event Missing",
    idMismatch: (id: string) => `The event ID "${id}" does not match any of our records, or its group is missing.`,
    backToEvents: "Back to All Events",
    edit: "Edit",
    series: "Series",
    cancelledEvent: "Cancelled Event",
    event: "Event",
    cancelEvent: "Cancel Event",
    reactivateEvent: "Reactivate Event",
    deleteEvent: "Delete Event",
    deleteSeries: "Delete Series (from master)",
    manageSeriesFromMaster: "To manage series, go to the master event settings.",
    reactivateConfirm: (name: string) => `Reactivate "${name}"?`,
    cancelConfirm: (name: string) => `Cancel "${name}"?`,
    reactivateDesc: "This will reactivate the event, allowing RSVPs and notifications again.",
    cancelDesc: "This will mark the event as cancelled. RSVPs will be disabled.",
    areYouSure: "Are you sure?",
    noKeep: "No, Keep As Is",
    yesReactivate: "Yes, Reactivate",
    yesCancel: "Yes, Cancel",
    deleteSeriesConfirm: (name: string) => `Delete the series "${name}"?`,
    deleteEventConfirm: (name: string) => `Delete event "${name}"?`,
    deleteDescRecurring: "This action cannot be undone and will permanently delete the event and all its future occurrences. Are you sure?",
    deleteDesc: "This action cannot be undone and will permanently delete the event. Are you sure?",
    delete: "Delete",
    dateAndTime: "Date & Time",
    at: "at",
    duration: (mins: number) => { const hours = mins / 60; return `(for ${hours} ${hours === 1 ? 'hour' : 'hours'})` },
    timeNotSpecified: "(Time not specified)",
    location: "Location",
    notSpecified: "Not specified",
    hostedBy: "Hosted by Group",
    attendees: "Attendees",
    personAttending: (count: number) => `${count} ${count === 1 ? 'person' : 'people'} attending`,
    viewAttendees: "View Attendees",
    attendeesFor: (name: string, date: string) => `Attendees for ${name} (on ${date})`,
    attendeesDesc: "This is a list of people who have RSVP'd to this specific event instance.",
    loadingAttendees: "Loading attendees...",
    noRsvps: "No one has RSVP'd yet.",
    you: "(You)",
    user: (id: string) => `User ${id.substring(0, 6)}...`,
    close: "Close",
    aboutEvent: "About this event:",
    noDescription: "No description provided for this event.",
    eventCancelledStatus: "EVENT CANCELLED",
    eventPassedStatus: "Event Has Passed",
    actionNotAllowed: "Action Not Allowed",
    missingInfo: "Missing required information to perform this action.",
    membershipRequired: "Membership Required",
    joinToRsvp: (name: string) => `Join "${name}" to RSVP.`,
    joinAndAttend: "Join Group & Attend Event",
    mustBeMemberRsvp: (name: string) => `You must be a member of "${name}" to RSVP.`,
    viewGroup: "View Group",
    attending: "You're Attending! (Cancel RSVP)",
    attendEvent: "Attend Event",
    confirmedRsvp: "Confirmed! We're excited to see you there.",
    notAttending: "You are not currently attending this event.",
    recurringInstance: "Recurring Event Instance",
    rsvpConfirmed: "RSVP Confirmed!",
    rsvpCancelled: "RSVP Cancelled",
    errorUpdateRsvp: "Could not update RSVP.",
    error: "Error",
    reportEvent: "Report Event",
    loginToRsvp: "Login to RSVP",
    share: "Share",
    copyLink: "Copy Link",
    shareToWhatsApp: "Share to WhatsApp",
    linkCopied: "Link Copied!",
    linkCopiedDesc: "Event link has been copied to your clipboard.",
  },
  es: {
    loading: "Cargando Detalles del Evento...",
    pleaseWait: "Por favor, espera.",
    accessDenied: "Acceso Denegado",
    cannotEdit: "No se puede editar este evento.",
    eventNotFound: "Evento no encontrado. Puede que haya sido movido o eliminado.",
    permissionDenied: "Permiso Denegado",
    groupNotFound: "No se pudo encontrar el grupo anfitrión de este evento.",
    adminRequiredToEdit: (name: string) => `Debes ser administrador/creador de "${name}" para editar este evento.`,
    privateMemberView: "Este evento es parte de un grupo privado. Debes ser miembro para verlo.",
    privateLoginView: "Este evento es parte de un grupo privado. Por favor, inicia sesión.",
    errorLoading: "Error al Cargar el Evento",
    couldNotLoad: "No se pudieron cargar los datos del evento.",
    eventNotFoundTitle: "Evento no Encontrado",
    sorryNotFound: "Lo sentimos, no pudimos encontrar el evento.",
    oopsMissing: "¡Ups! Evento no Encontrado",
    idMismatch: (id: string) => `El ID del evento "${id}" no coincide con nuestros registros, o su grupo ha sido eliminado.`,
    backToEvents: "Volver a Todos los Eventos",
    edit: "Editar",
    series: "Serie",
    cancelledEvent: "Evento Cancelado",
    event: "Evento",
    cancelEvent: "Cancelar Evento",
    reactivateEvent: "Reactivar Evento",
    deleteEvent: "Eliminar Evento",
    deleteSeries: "Eliminar Serie (desde el principal)",
    manageSeriesFromMaster: "Para gestionar series, ve a los ajustes del evento principal.",
    reactivateConfirm: (name: string) => `¿Reactivar "${name}"?`,
    cancelConfirm: (name: string) => `¿Cancelar "${name}"?`,
    reactivateDesc: "Esto reactivará el evento, permitiendo de nuevo confirmaciones de asistencia y notificaciones.",
    cancelDesc: "Esto marcará el evento como cancelado. Las confirmaciones de asistencia se desactivarán.",
    areYouSure: "¿Estás seguro?",
    noKeep: "No, Mantener como Está",
    yesReactivate: "Sí, Reactivar",
    yesCancel: "Sí, Cancelar",
    deleteSeriesConfirm: (name: string) => `¿Eliminar la serie "${name}"?`,
    deleteEventConfirm: (name: string) => `¿Eliminar el evento "${name}"?`,
    deleteDescRecurring: "Esta acción no se puede deshacer y eliminará permanentemente el evento y todas sus futuras ocurrencias. ¿Estás seguro?",
    deleteDesc: "Esta acción no se puede deshacer y eliminará permanentemente el evento. ¿Estás seguro?",
    delete: "Eliminar",
    dateAndTime: "Fecha y Hora",
    at: "a las",
    duration: (mins: number) => { const hours = mins / 60; return `(por ${hours} ${hours === 1 ? 'hora' : 'horas'})` },
    timeNotSpecified: "(Hora no especificada)",
    location: "Ubicación",
    notSpecified: "No especificada",
    hostedBy: "Organizado por el Grupo",
    attendees: "Asistentes",
    personAttending: (count: number) => `${count} ${count === 1 ? 'persona' : 'personas'} asistiendo`,
    viewAttendees: "Ver Asistentes",
    attendeesFor: (name: string, date: string) => `Asistentes para ${name} (el ${date})`,
    attendeesDesc: "Esta es una lista de las personas que han confirmado su asistencia a esta instancia específica del evento.",
    loadingAttendees: "Cargando asistentes...",
    noRsvps: "Nadie ha confirmado su asistencia todavía.",
    you: "(Tú)",
    user: (id: string) => `Usuario ${id.substring(0, 6)}...`,
    close: "Cerrar",
    aboutEvent: "Sobre este evento:",
    noDescription: "No se ha proporcionado una descripción para este evento.",
    eventCancelledStatus: "EVENTO CANCELADO",
    eventPassedStatus: "El Evento ya Pasó",
    actionNotAllowed: "Acción no Permitida",
    missingInfo: "Falta la información necesaria para realizar esta acción.",
    membershipRequired: "Se Requiere Ser Miembro",
    joinToRsvp: (name: string) => `Únete a "${name}" para confirmar tu asistencia.`,
    joinAndAttend: "Unirse al Grupo y Asistir al Evento",
    mustBeMemberRsvp: (name: string) => `Debes ser miembro de "${name}" para confirmar tu asistencia.`,
    viewGroup: "Ver Grupo",
    attending: "¡Asistirás! (Cancelar RSVP)",
    attendEvent: "Asistir al Evento",
    confirmedRsvp: "¡Confirmado! Estamos emocionados de verte allí.",
    notAttending: "Actualmente no asistes a este evento.",
    recurringInstance: "Instancia de Evento Recurrente",
    rsvpConfirmed: "¡RSVP Confirmado!",
    rsvpCancelled: "RSVP Cancelado",
    errorUpdateRsvp: "No se pudo actualizar el RSVP.",
    error: "Error",
    reportEvent: "Reportar Evento",
    loginToRsvp: "Iniciar sesión para confirmar",
    share: "Compartir",
    copyLink: "Copiar Enlace",
    shareToWhatsApp: "Compartir en WhatsApp",
    linkCopied: "¡Enlace Copiado!",
    linkCopiedDesc: "El enlace del evento ha sido copiado a tu portapapeles.",
  },
  pt: {
    loading: "Carregando Detalhes do Evento...",
    pleaseWait: "Por favor, aguarde.",
    accessDenied: "Acesso Negado",
    cannotEdit: "Não é possível editar este evento.",
    eventNotFound: "Evento não encontrado. Pode ter sido movido ou excluído.",
    permissionDenied: "Permissão Negada",
    groupNotFound: "O grupo anfitrião deste evento não foi encontrado.",
    adminRequiredToEdit: (name: string) => `Você deve ser um administrador/criador de "${name}" para editar este evento.`,
    privateMemberView: "Este evento faz parte de um grupo privado. Você deve ser um membro para visualizá-lo.",
    privateLoginView: "Este evento faz parte de um grupo privado. Por favor, faça login.",
    errorLoading: "Erro ao Carregar o Evento",
    couldNotLoad: "Não foi possível carregar os dados do evento.",
    eventNotFoundTitle: "Evento Não Encontrado",
    sorryNotFound: "Desculpe, não conseguimos encontrar o evento.",
    oopsMissing: "Ops! Evento não encontrado",
    idMismatch: (id: string) => `O ID do evento "${id}" não corresponde a nenhum de nossos registros, ou seu grupo foi excluído.`,
    backToEvents: "Voltar para Todos os Eventos",
    edit: "Editar",
    series: "Série",
    cancelledEvent: "Evento Cancelado",
    event: "Evento",
    cancelEvent: "Cancelar Evento",
    reactivateEvent: "Reativar Evento",
    deleteEvent: "Excluir Evento",
    deleteSeries: "Excluir Série (a partir do principal)",
    manageSeriesFromMaster: "Para gerenciar séries, vá para as configurações do evento principal.",
    reactivateConfirm: (name: string) => `Reativar "${name}"?`,
    cancelConfirm: (name: string) => `Cancelar "${name}"?`,
    reactivateDesc: "Isso reativará o evento, permitindo novamente confirmações de presença e notificações.",
    cancelDesc: "Isso marcará o evento como cancelado. As confirmações de presença serão desativadas.",
    areYouSure: "Você tem certeza?",
    noKeep: "Não, Manter como Está",
    yesReactivate: "Sim, Reativar",
    yesCancel: "Sim, Cancelar",
    deleteSeriesConfirm: (name: string) => `Excluir a série "${name}"?`,
    deleteEventConfirm: (name: string) => `Excluir o evento "${name}"?`,
    deleteDescRecurring: "Esta ação não pode ser desfeita e excluirá permanentemente o evento e todas as suas futuras ocorrências. Você tem certeza?",
    deleteDesc: "Esta ação não pode ser desfeita e excluirá permanentemente o evento. Você tem certeza?",
    delete: "Excluir",
    dateAndTime: "Data e Hora",
    at: "às",
    duration: (mins: number) => { const hours = mins / 60; return `(por ${hours} ${hours === 1 ? 'hora' : 'horas'})` },
    timeNotSpecified: "(Horário não especificado)",
    location: "Local",
    notSpecified: "Não especificado",
    hostedBy: "Organizado pelo Grupo",
    attendees: "Participantes",
    personAttending: (count: number) => `${count} ${count === 1 ? 'pessoa' : 'pessoas'} participando`,
    viewAttendees: "Ver Participantes",
    attendeesFor: (name: string, date: string) => `Participantes de ${name} (em ${date})`,
    attendeesDesc: "Esta é uma lista de pessoas que confirmaram presença nesta instância específica do evento.",
    loadingAttendees: "Carregando participantes...",
    noRsvps: "Ninguém confirmou presença ainda.",
    you: "(Você)",
    user: (id: string) => `Usuário ${id.substring(0, 6)}...`,
    close: "Fechar",
    aboutEvent: "Sobre este evento:",
    noDescription: "Nenhuma descrição fornecida para este evento.",
    eventCancelledStatus: "EVENTO CANCELADO",
    eventPassedStatus: "O Evento já Passou",
    actionNotAllowed: "Ação Não Permitida",
    missingInfo: "Faltam as informações necessárias para realizar esta ação.",
    membershipRequired: "É Necessário Ser Membro",
    joinToRsvp: (name: string) => `Junte-se a "${name}" para confirmar sua presença.`,
    joinAndAttend: "Juntar-se ao Grupo e Participar do Evento",
    mustBeMemberRsvp: (name: string) => `Você deve ser membro de "${name}" para confirmar sua presença.`,
    viewGroup: "Ver Grupo",
    attending: "Você vai! (Cancelar RSVP)",
    attendEvent: "Participar do Evento",
    confirmedRsvp: "Confirmado! Estamos animados para te ver lá.",
    notAttending: "Você não está participando deste evento no momento.",
    recurringInstance: "Instância de Evento Recurrente",
    rsvpConfirmed: "RSVP Confirmado!",
    rsvpCancelled: "RSVP Cancelado",
    errorUpdateRsvp: "Não foi possível atualizar o RSVP.",
    error: "Erro",
    reportEvent: "Denunciar Evento",
    loginToRsvp: "Entrar para confirmar presença",
    share: "Compartilhar",
    copyLink: "Copiar Link",
    shareToWhatsApp: "Compartilhar no WhatsApp",
    linkCopied: "Link Copiado!",
    linkCopiedDesc: "O link do evento foi copiado para sua área de transferência.",
  },
  fr: {
    loading: "Chargement des Détails de l'Événement...",
    pleaseWait: "Veuillez patienter.",
    accessDenied: "Accès Refusé",
    cannotEdit: "Impossible de modifier cet événement.",
    eventNotFound: "Événement non trouvé. Il a peut-être été déplacé ou supprimé.",
    permissionDenied: "Permission Refusée",
    groupNotFound: "Le groupe qui héberge cet événement n'a pas pu être trouvé.",
    adminRequiredToEdit: (name: string) => `Vous devez être administrateur/créateur de "${name}" pour modifier cet événement.`,
    privateMemberView: "Cet événement fait partie d'un groupe privé. Vous devez être membre pour le voir.",
    privateLoginView: "Cet événement fait partie d'un groupe privé. Veuillez vous connecter.",
    errorLoading: "Erreur lors du Chargement de l'Événement",
    couldNotLoad: "Impossible de charger les données de l'événement.",
    eventNotFoundTitle: "Événement Non Trouvé",
    sorryNotFound: "Désolé, nous n'avons pas pu trouver l'événement.",
    oopsMissing: "Oups ! Événement Manquant",
    idMismatch: (id: string) => `L'ID de l'événement "${id}" ne correspond à aucun de nos enregistrements, ou son groupe a été supprimé.`,
    backToEvents: "Retour à Tous les Événements",
    edit: "Modifier",
    series: "Série",
    cancelledEvent: "Événement Annulé",
    event: "Événement",
    cancelEvent: "Annuler l'Événement",
    reactivateEvent: "Réactiver l'Événement",
    deleteEvent: "Supprimer l'Événement",
    deleteSeries: "Supprimer la Série (depuis le principal)",
    manageSeriesFromMaster: "Pour gérer les séries, allez dans les paramètres de l'événement principal.",
    reactivateConfirm: (name: string) => `Réactiver "${name}" ?`,
    cancelConfirm: (name: string) => `Annuler "${name}" ?`,
    reactivateDesc: "Cela réactivera l'événement, autorisant à nouveau les RSVP et les notifications.",
    cancelDesc: "Cela marquera l'événement comme annulé. Les RSVP seront désactivés.",
    areYouSure: "Êtes-vous sûr ?",
    noKeep: "Non, Laisser Tel Quel",
    yesReactivate: "Oui, Réactiver",
    yesCancel: "Oui, Annuler",
    deleteSeriesConfirm: (name: string) => `Supprimer la série "${name}" ?`,
    deleteEventConfirm: (name: string) => `Supprimer l'événement "${name}" ?`,
    deleteDescRecurring: "Cette action est irréversible et supprimera définitivement l'événement et toutes ses futures occurrences. Êtes-vous sûr ?",
    deleteDesc: "Cette action est irréversible et supprimera définitivement l'événement. Êtes-vous sûr ?",
    delete: "Supprimer",
    dateAndTime: "Date et Heure",
    at: "à",
    duration: (mins: number) => { const hours = mins / 60; return `(pendant ${hours} ${hours === 1 ? 'heure' : 'heures'})` },
    timeNotSpecified: "(Heure non spécifiée)",
    location: "Lieu",
    notSpecified: "Non spécifié",
    hostedBy: "Organisé par le Groupe",
    attendees: "Participants",
    personAttending: (count: number) => `${count} ${count === 1 ? 'personne' : 'personnes'} participant(e)s`,
    viewAttendees: "Voir les Participants",
    attendeesFor: (name: string, date: string) => `Participants de ${name} (le ${date})`,
    attendeesDesc: "Voici la liste des personnes qui ont confirmé leur présence à cette instance spécifique de l'événement.",
    loadingAttendees: "Chargement des participants...",
    noRsvps: "Personne n'a encore confirmé sa présence.",
    you: "(Vous)",
    user: (id: string) => `Utilisateur ${id.substring(0, 6)}...`,
    close: "Fermer",
    aboutEvent: "À propos de cet événement :",
    noDescription: "Aucune description fournie pour cet événement.",
    eventCancelledStatus: "ÉVÉNEMENT ANNULÉ",
    eventPassedStatus: "L'Événement est Passé",
    actionNotAllowed: "Action non autorisée",
    missingInfo: "Les informations requises pour effectuer cette action sont manquantes.",
    membershipRequired: "Adhésion Requise",
    joinToRsvp: (name: string) => `Rejoignez "${name}" pour confirmer votre présence.`,
    joinAndAttend: "Rejoindre le Groupe et Participer",
    mustBeMemberRsvp: (name: string) => `Vous devez être membre de "${name}" pour confirmer votre présence.`,
    viewGroup: "Voir le Groupe",
    attending: "Vous participez ! (Annuler RSVP)",
    attendEvent: "Participer à l'Événement",
    confirmedRsvp: "Confirmé ! Nous sommes ravis de vous y voir.",
    notAttending: "Vous ne participez pas actuellement à cet événement.",
    recurringInstance: "Instance d'Événement Récurrent",
    rsvpConfirmed: "RSVP Confirmé !",
    rsvpCancelled: "RSVP Annulé",
    errorUpdateRsvp: "Impossible de mettre à jour le RSVP.",
    error: "Erreur",
    reportEvent: "Signaler l'Événement",
    loginToRsvp: "Se connecter pour répondre",
    share: "Partager",
    copyLink: "Copier le lien",
    shareToWhatsApp: "Partager sur WhatsApp",
    linkCopied: "Lien Copié !",
    linkCopiedDesc: "Le lien de l'événement a été copié dans votre presse-papiers.",
  },
  de: {
    loading: "Lade Event-Details...",
    pleaseWait: "Bitte warten.",
    accessDenied: "Zugriff verweigert",
    cannotEdit: "Dieses Event kann nicht bearbeitet werden.",
    eventNotFound: "Event nicht gefunden. Es wurde möglicherweise verschoben oder gelöscht.",
    permissionDenied: "Berechtigung verweigert",
    groupNotFound: "Die Gruppe, die dieses Event veranstaltet, wurde nicht gefunden.",
    adminRequiredToEdit: (name: string) => `Sie müssen Admin/Ersteller von "${name}" sein, um dieses Event zu bearbeiten.`,
    privateMemberView: "Dieses Event ist Teil einer privaten Gruppe. Sie müssen Mitglied sein, um es zu sehen.",
    privateLoginView: "Dieses Event ist Teil einer privaten Gruppe. Bitte einloggen.",
    errorLoading: "Fehler beim Laden des Events",
    couldNotLoad: "Event-Daten konnten nicht geladen werden.",
    eventNotFoundTitle: "Event nicht gefunden",
    sorryNotFound: "Entschuldigung, wir konnten das Event nicht finden.",
    oopsMissing: "Hoppla! Event fehlt",
    idMismatch: (id: string) => `Die Event-ID "${id}" stimmt mit keinem unserer Einträge überein oder die zugehörige Gruppe fehlt.`,
    backToEvents: "Zurück zu allen Events",
    edit: "Bearbeiten",
    series: "Serie",
    cancelledEvent: "Abgesagtes Event",
    event: "Event",
    cancelEvent: "Event absagen",
    reactivateEvent: "Event reaktivieren",
    deleteEvent: "Event löschen",
    deleteSeries: "Serie löschen (vom Master)",
    manageSeriesFromMaster: "Um Serien zu verwalten, gehen Sie zu den Master-Event-Einstellungen.",
    reactivateConfirm: (name: string) => `"${name}" reaktivieren?`,
    cancelConfirm: (name: string) => `"${name}" absagen?`,
    reactivateDesc: "Dadurch wird das Event reaktiviert und RSVPs und Benachrichtigungen werden wieder zugelassen.",
    cancelDesc: "Dadurch wird das Event als abgesagt markiert. RSVPs werden deaktiviert.",
    areYouSure: "Sind Sie sicher?",
    noKeep: "Nein, so belassen",
    yesReactivate: "Ja, reaktivieren",
    yesCancel: "Ja, absagen",
    deleteSeriesConfirm: (name: string) => `Die Serie "${name}" löschen?`,
    deleteEventConfirm: (name: string) => `Event "${name}" löschen?`,
    deleteDescRecurring: "Diese Aktion kann nicht rückgängig gemacht werden und löscht das Event und alle zukünftigen Vorkommen dauerhaft. Sind Sie sicher?",
    deleteDesc: "Diese Aktion kann nicht rückgängig gemacht werden und löscht das Event dauerhaft. Sind Sie sicher?",
    delete: "Löschen",
    dateAndTime: "Datum & Uhrzeit",
    at: "um",
    duration: (mins: number) => { const hours = mins / 60; return `(für ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'})` },
    timeNotSpecified: "(Uhrzeit nicht angegeben)",
    location: "Ort",
    notSpecified: "Nicht angegeben",
    hostedBy: "Veranstaltet von Gruppe",
    attendees: "Teilnehmer",
    personAttending: (count: number) => `${count} ${count === 1 ? 'Person nimmt' : 'Personen nehmen'} teil`,
    viewAttendees: "Teilnehmer anzeigen",
    attendeesFor: (name: string, date: string) => `Teilnehmer für ${name} (am ${date})`,
    attendeesDesc: "Dies ist eine Liste der Personen, die für diesen spezifischen Event-Termin zugesagt haben.",
    loadingAttendees: "Lade Teilnehmer...",
    noRsvps: "Noch niemand hat zugesagt.",
    you: "(Du)",
    user: (id: string) => `Benutzer ${id.substring(0, 6)}...`,
    close: "Schließen",
    aboutEvent: "Über dieses Event:",
    noDescription: "Für dieses Event wurde keine Beschreibung bereitgestellt.",
    eventCancelledStatus: "EVENT ABGESAGT",
    eventPassedStatus: "Event ist bereits vorbei",
    actionNotAllowed: "Aktion nicht erlaubt",
    missingInfo: "Fehlende erforderliche Informationen, um diese Aktion auszuführen.",
    membershipRequired: "Mitgliedschaft erforderlich",
    joinToRsvp: (name: string) => `Tritt "${name}" bei, um zuzusagen.`,
    joinAndAttend: "Gruppe beitreten & Event besuchen",
    mustBeMemberRsvp: (name: string) => `Sie müssen Mitglied von "${name}" sein, um zuzusagen.`,
    viewGroup: "Gruppe anzeigen",
    attending: "Du nimmst teil! (RSVP stornieren)",
    attendEvent: "Am Event teilnehmen",
    confirmedRsvp: "Bestätigt! Wir freuen uns, dich dort zu sehen.",
    notAttending: "Du nimmst derzeit nicht an diesem Event teil.",
    recurringInstance: "Wiederkehrender Event-Termin",
    rsvpConfirmed: "RSVP bestätigt!",
    rsvpCancelled: "RSVP storniert",
    errorUpdateRsvp: "RSVP konnte nicht aktualisiert werden.",
    error: "Fehler",
    reportEvent: "Event melden",
    loginToRsvp: "Zum Zusagen anmelden",
    share: "Teilen",
    copyLink: "Link kopieren",
    shareToWhatsApp: "Auf WhatsApp teilen",
    linkCopied: "Link kopiert!",
    linkCopiedDesc: "Event-Link wurde in Ihre Zwischenablage kopiert.",
  },
  it: {
    loading: "Caricamento Dettagli Evento...",
    pleaseWait: "Attendere prego.",
    accessDenied: "Accesso Negato",
    cannotEdit: "Impossibile modificare questo evento.",
    eventNotFound: "Evento non trovato. Potrebbe essere stato spostato o eliminato.",
    permissionDenied: "Permesso Negato",
    groupNotFound: "Il gruppo che ospita questo evento non è stato trovato.",
    adminRequiredToEdit: (name: string) => `Devi essere un amministratore/creatore di "${name}" per modificare questo evento.`,
    privateMemberView: "Questo evento fa parte di un gruppo privato. Devi essere un membro per vederlo.",
    privateLoginView: "Questo evento fa parte di un gruppo privato. Effettua il login.",
    errorLoading: "Errore nel Caricamento dell'Evento",
    couldNotLoad: "Impossibile caricare i dati dell'evento.",
    eventNotFoundTitle: "Evento Non Trovata",
    sorryNotFound: "Spiacenti, non siamo riusciti a trovare l'evento.",
    oopsMissing: "Ops! Evento Mancante",
    idMismatch: (id: string) => `L'ID dell'evento "${id}" non corrisponde a nessuno dei nostri record, o il suo gruppo è mancante.`,
    backToEvents: "Torna a Tutti gli Eventi",
    edit: "Modifica",
    series: "Serie",
    cancelledEvent: "Evento Annullato",
    event: "Evento",
    cancelEvent: "Annulla Evento",
    reactivateEvent: "Riattiva Evento",
    deleteEvent: "Elimina Evento",
    deleteSeries: "Elimina Serie (dal principale)",
    manageSeriesFromMaster: "Per gestire le serie, vai alle impostazioni dell'evento principale.",
    reactivateConfirm: (name: string) => `Riattivare "${name}"?`,
    cancelConfirm: (name: string) => `Annullare "${name}"?`,
    reactivateDesc: "Questo riattiverà l'evento, consentendo di nuovo RSVP e notifiche.",
    cancelDesc: "Questo contrassegnerà l'evento come annullato. Gli RSVP saranno disabilitati.",
    areYouSure: "Sei sicuro?",
    noKeep: "No, Lascia Così",
    yesReactivate: "Sì, Riattiva",
    yesCancel: "Sì, Annulla",
    deleteSeriesConfirm: (name: string) => `Eliminare la serie "${name}"?`,
    deleteEventConfirm: (name: string) => `Eliminare l'evento "${name}"?`,
    deleteDescRecurring: "Questa azione non può essere annullata ed eliminerà permanentemente l'evento e tutte le sue occorrenze future. Sei sicuro?",
    deleteDesc: "Questa azione non può essere annullata ed eliminerà permanentemente l'evento. Sei sicuro?",
    delete: "Elimina",
    dateAndTime: "Data e Ora",
    at: "alle",
    duration: (mins: number) => { const hours = mins / 60; return `(per ${hours} ${hours === 1 ? 'ora' : 'ore'})` },
    timeNotSpecified: "(Orario non specificato)",
    location: "Luogo",
    notSpecified: "Non specificato",
    hostedBy: "Ospitato dal Gruppo",
    attendees: "Partecipanti",
    personAttending: (count: number) => `${count} ${count === 1 ? 'persona' : 'persone'} partecipano`,
    viewAttendees: "Vedi Partecipanti",
    attendeesFor: (name: string, date: string) => `Partecipanti per ${name} (il ${date})`,
    attendeesDesc: "Questa è una lista di persone che hanno confermato la loro presenza a questa specifica istanza dell'evento.",
    loadingAttendees: "Caricamento partecipanti...",
    noRsvps: "Nessuno ha ancora confermato la presenza.",
    you: "(Tu)",
    user: (id: string) => `Utente ${id.substring(0, 6)}...`,
    close: "Chiudi",
    aboutEvent: "Riguardo a questo evento:",
    noDescription: "Nessuna descrizione fornita per questo evento.",
    eventCancelledStatus: "EVENTO ANNULLATO",
    eventPassedStatus: "L'Evento è Terminato",
    actionNotAllowed: "Azione Non Consentita",
    missingInfo: "Informazioni richieste mancanti per eseguire questa azione.",
    membershipRequired: "Iscrizione Richiesta",
    joinToRsvp: (name: string) => `Unisciti a "${name}" per confermare la presenza.`,
    joinAndAttend: "Unisciti al Gruppo e Partecipa all'Evento",
    mustBeMemberRsvp: (name: string) => `Devi essere un membro di "${name}" per confermare la presenza.`,
    viewGroup: "Vedi Gruppo",
    attending: "Partecipi! (Annulla RSVP)",
    attendEvent: "Partecipa all'Evento",
    confirmedRsvp: "Confermato! Siamo entusiasti di vederti lì.",
    notAttending: "Al momento non partecipi a questo evento.",
    recurringInstance: "Istanza di Evento Ricorrente",
    rsvpConfirmed: "RSVP Confermato!",
    rsvpCancelled: "RSVP Annullato",
    errorUpdateRsvp: "Impossibile aggiornare l'RSVP.",
    error: "Errore",
    reportEvent: "Segnala Evento",
    loginToRsvp: "Accedi per confermare",
    share: "Condividi",
    copyLink: "Copia link",
    shareToWhatsApp: "Condividi su WhatsApp",
    linkCopied: "Link Copiato!",
    linkCopiedDesc: "Il link dell'evento è stato copiato negli appunti.",
  },
  ru: {
    loading: "Загрузка сведений о событии...",
    pleaseWait: "Пожалуйста, подождите.",
    accessDenied: "Доступ запрещен",
    cannotEdit: "Невозможно отредактировать это событие.",
    eventNotFound: "Событие не найдено. Возможно, оно было перемещено или удалено.",
    permissionDenied: "В доступе отказано",
    groupNotFound: "Группа, в которой проводится это событие, не найдена.",
    adminRequiredToEdit: (name: string) => `Вы должны быть администратором/создателем группы "${name}", чтобы редактировать это событие.`,
    privateMemberView: "Это событие является частью частной группы. Вы должны быть участником, чтобы просмотреть его.",
    privateLoginView: "Это событие является частью частной группы. Пожалуйста, войдите в систему.",
    errorLoading: "Ошибка загрузки события",
    couldNotLoad: "Не удалось загрузить данные о событии.",
    eventNotFoundTitle: "Событие не найдено",
    sorryNotFound: "К сожалению, мы не смогли найти это событие.",
    oopsMissing: "Ой! Событие отсутствует",
    idMismatch: (id: string) => `Идентификатор события "${id}" не соответствует ни одной из наших записей, или его группа отсутствует.`,
    backToEvents: "Назад ко всем событиям",
    edit: "Редактировать",
    series: "Серия",
    cancelledEvent: "Отмененное событие",
    event: "Событие",
    cancelEvent: "Отменить событие",
    reactivateEvent: "Возоновить событие",
    deleteEvent: "Удалить событие",
    deleteSeries: "Удалить серию (из основного)",
    manageSeriesFromMaster: "Для управления сериями перейдите в настройки основного события.",
    reactivateConfirm: (name: string) => `Возобновить "${name}"?`,
    cancelConfirm: (name: string) => `Отменить "${name}"?`,
    reactivateDesc: "Это возобновит событие, снова разрешив RSVP и уведомления.",
    cancelDesc: "Это пометит событие как отмененное. RSVP будут отключены.",
    areYouSure: "Вы уверены?",
    noKeep: "Нет, оставить как есть",
    yesReactivate: "Да, возобновить",
    yesCancel: "Да, отменить",
    deleteSeriesConfirm: (name: string) => `Удалить серию "${name}"?`,
    deleteEventConfirm: (name: string) => `Удалить событие "${name}"?`,
    deleteDescRecurring: "Это действие нельзя отменить, оно навсегда удалит событие и все его будущие повторения. Вы уверены?",
    deleteDesc: "Это действие нельзя отменить, и оно навсегда удалит событие. Вы уверены?",
    delete: "Удалить",
    dateAndTime: "Дата и время",
    at: "в",
    duration: (mins: number) => { const hours = mins / 60; return `(на ${hours} ${hours === 1 ? 'час' : 'часа(ов)'})` },
    timeNotSpecified: "(Время не указано)",
    location: "Местоположение",
    notSpecified: "Не указано",
    hostedBy: "Организатор: Группа",
    attendees: "Участники",
    personAttending: (count: number) => `${count} ${count === 1 ? 'человек' : (count > 1 && count < 5 ? 'человека' : 'человек')} идет`,
    viewAttendees: "Посмотреть участников",
    attendeesFor: (name: string, date: string) => `Участники "${name}" (${date})`,
    attendeesDesc: "Это список людей, которые подтвердили свое участие в этом конкретном экземпляре события.",
    loadingAttendees: "Загрузка участников...",
    noRsvps: "Еще никто не подтвердил участие.",
    you: "(Вы)",
    user: (id: string) => `Пользователь ${id.substring(0, 6)}...`,
    close: "Закрыть",
    aboutEvent: "Об этом событии:",
    noDescription: "Для этого события нет описания.",
    eventCancelledStatus: "СОБЫТИЕ ОТМЕНЕНО",
    eventPassedStatus: "Событие уже прошло",
    actionNotAllowed: "Действие не разрешено",
    missingInfo: "Отсутствует необходимая информация для выполнения этого действия.",
    membershipRequired: "Требуется членство",
    joinToRsvp: (name: string) => `Присоединитесь к "${name}", чтобы подтвердить участие.`,
    joinAndAttend: "Присоединиться к группе и посетить событие",
    mustBeMemberRsvp: (name: string) => `Вы должны быть участником группы "${name}", чтобы подтвердить участие.`,
    viewGroup: "Посмотреть группу",
    attending: "Вы идете! (Отменить RSVP)",
    attendEvent: "Посетить событие",
    confirmedRsvp: "Подтверждено! Мы рады вас видеть.",
    notAttending: "Вы в настоящее время не посещаете это событие.",
    recurringInstance: "Повторяющееся событие",
    rsvpConfirmed: "RSVP подтверждено!",
    rsvpCancelled: "RSVP отменено",
    errorUpdateRsvp: "Не удалось обновить RSVP.",
    error: "Ошибка",
    reportEvent: "Пожаловаться на событие",
    loginToRsvp: "Войдите, чтобы подтвердить участие",
    share: "Поделиться",
    copyLink: "Копировать ссылку",
    shareToWhatsApp: "Поделиться в WhatsApp",
    linkCopied: "Ссылка скопирована!",
    linkCopiedDesc: "Ссылка на событие скопирована в буфер обмена.",
  }
};


export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId; 
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [hostingGroupInfo, setHostingGroupInfo] = useState<StoredGroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const [isAttending, setIsAttending] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [isMemberOfHostingGroup, setIsMemberOfHostingGroup] = useState(false);
  const [canManageMasterEvent, setCanManageMasterEvent] = useState(false); 
  const [eventIsPast, setEventIsPast] = useState(false);
  const [eventIsCancelled, setEventIsCancelled] = useState(false); 

  const [attendeeDetails, setAttendeeDetails] = useState<Record<string, Pick<ContactableUser, 'id' | 'name' | 'avatar' | 'email'> | null>>({});
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [currentDialogEventId, setCurrentDialogEventId] = useState<string | null>(null);

  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split('-')[0] as 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru';
      if (translations[browserLang]) {
        setLang(browserLang);
      }
    }
  }, []);
  
  const t = translations[lang];

  useEffect(() => {
    if (currentEvent) {
      document.title = `${currentEvent.name} | GroupHub`;
    }
  }, [currentEvent]);

  const fetchEventData = useCallback(async () => {
    if (!eventId || authLoading) {
      setLoading(authLoading);
      return;
    }
    setLoading(true);
    setAccessDeniedMessage(null);
    setAttendeeDetails({}); // Reset attendee details on new fetch

    const isInstanceId = eventId.includes("_");
    const masterEventIdFromParam = isInstanceId ? eventId.split("_")[0] : eventId;
    const instanceDateFromParam = isInstanceId ? eventId.split("_")[1] : null;

    const masterEventFromServer = await getMasterEventById(masterEventIdFromParam);

    if (!masterEventFromServer) {
      setAccessDeniedMessage(t.eventNotFound);
      setLoading(false); return;
    }

    const masterEvent = {
        ...masterEventFromServer,
        attendees: Array.isArray(masterEventFromServer.attendees) ? masterEventFromServer.attendees : [],
        instanceAttendees: masterEventFromServer.instanceAttendees || {},
        instanceMetadata: masterEventFromServer.instanceMetadata || {},
        isCancelled: typeof masterEventFromServer.isCancelled === 'boolean' ? masterEventFromServer.isCancelled : false,
        image: (typeof masterEventFromServer.image === 'string' && masterEventFromServer.image.trim() !== '') ? masterEventFromServer.image : DEFAULT_EVENT_IMAGE,
    };

    let eventToDisplay: Event;
    let actualCancellationStatus = false;

    if (isInstanceId && instanceDateFromParam) {
      actualCancellationStatus = masterEvent.instanceMetadata?.[instanceDateFromParam]?.isCancelled || masterEvent.isCancelled || false;
      eventToDisplay = { ...masterEvent, id: eventId, date: instanceDateFromParam, isInstance: true, masterEventId: masterEvent.id, attendees: masterEvent.instanceAttendees?.[instanceDateFromParam] || [], isRecurring: false, recurrence: undefined, isCancelled: actualCancellationStatus, };
    } else {
      actualCancellationStatus = masterEvent.isCancelled || false;
      eventToDisplay = { ...masterEvent, isCancelled: actualCancellationStatus };
    }
    
    setCurrentEvent(eventToDisplay);
    setEventIsPast(isDatePast(eventToDisplay.date));
    setEventIsCancelled(actualCancellationStatus);
    setAttendeeCount(eventToDisplay.attendees.length);

    if (eventToDisplay.attendees.length > 0) {
        setIsLoadingAttendees(true);
        try {
            const details = await S_getMultipleContactableUserDetails(eventToDisplay.attendees);
            setAttendeeDetails(details);
        } catch (e) { console.error("Error fetching attendee details:", e); }
        setIsLoadingAttendees(false);
    }

    const groupForEvent = await getGroupById(masterEvent.groupId);
    if (!groupForEvent) { setAccessDeniedMessage(t.groupNotFound); setCurrentEvent(null); setLoading(false); return; }
    setHostingGroupInfo(groupForEvent);

    if (currentUser) {
      const userIsMember = groupForEvent.memberIds.includes(currentUser.uid);
      setIsMemberOfHostingGroup(userIsMember);
      setIsAttending(eventToDisplay.attendees.includes(currentUser.uid));
      const isAdminOrCreatorOfMaster = groupForEvent.adminIds.includes(currentUser.uid) || groupForEvent.creatorId === currentUser.uid;
      setCanManageMasterEvent(isAdminOrCreatorOfMaster);
      if (!groupForEvent.isPublic && !userIsMember) { setAccessDeniedMessage(t.privateMemberView); }
    } else {
      setIsMemberOfHostingGroup(false); setIsAttending(false); setCanManageMasterEvent(false);
      if (!groupForEvent.isPublic) { setAccessDeniedMessage(t.privateLoginView); }
    }
    setLoading(false);
  }, [eventId, currentUser, authLoading, t]);

  useEffect(() => {
    fetchEventData().catch(e => {
      console.error("Error in fetchEventData useEffect:", e);
      setAccessDeniedMessage(t.errorLoading);
      setLoading(false);
    });
  }, [fetchEventData, t.errorLoading]);

  const handleJoinAndRsvp = async () => {
    if (!currentEvent || !currentUser || !hostingGroupInfo) {
      toast({ title: t.actionNotAllowed, description: t.missingInfo, variant: "destructive" });
      return;
    }
    if (!hostingGroupInfo.isPublic) {
      toast({ title: "Private Group", description: "You must request to join private groups.", variant: "destructive" });
      return;
    }
    const result = await S_joinGroupAndRsvpToEvent(hostingGroupInfo.id, currentEvent.id, currentUser.uid);
    if (result.success) {
      toast({ title: "Success!", description: "You've joined the group and are now attending the event." });
      dispatchStorageUpdatedEvent();
      fetchEventData();
    } else {
      toast({ title: t.error, description: result.message || "Could not join group and RSVP.", variant: "destructive" });
    }
  };


  const handleRsvpToggle = async () => {
    if (!currentEvent || !currentUser || !hostingGroupInfo || eventIsPast || eventIsCancelled) {
        toast({ title: eventIsPast ? t.eventPassedStatus : eventIsCancelled ? t.cancelledEvent : t.actionNotAllowed, variant: "destructive" });
        return;
    }
    if (!isMemberOfHostingGroup) {
        toast({ title: t.membershipRequired, description: t.joinToRsvp(hostingGroupInfo.name), variant: "destructive" });
        return;
    }

    // --- OPTIMISTIC UI START ---
    const prevIsAttending = isAttending;
    const prevAttendeeCount = attendeeCount;
    const prevAttendees = [...currentEvent.attendees];

    const newIsAttending = !prevIsAttending;
    const newAttendees = newIsAttending 
        ? (prevAttendees.includes(currentUser.uid) ? prevAttendees : [...prevAttendees, currentUser.uid])
        : prevAttendees.filter(id => id !== currentUser.uid);

    // Apply immediate local state changes
    setIsAttending(newIsAttending);
    setAttendeeCount(newAttendees.length);
    setCurrentEvent(prev => prev ? { ...prev, attendees: newAttendees } : null);
    toast({ title: newIsAttending ? t.rsvpConfirmed : t.rsvpCancelled });
    // --- OPTIMISTIC UI END ---

    const masterEventToUpdateId = currentEvent.masterEventId || currentEvent.id;
    
    try {
        // We still need the master event to update instanceAttendees map properly on the server side
        // without accidentally wiping out other instances if the API is simple.
        const masterEventSnapshot = await getMasterEventById(masterEventToUpdateId); 
        if (!masterEventSnapshot) throw new Error("Master event not found.");

        const updatePayload: Partial<Omit<Event, 'id' | 'groupId'>> = {};
        if (currentEvent.isInstance) {
            updatePayload.instanceAttendees = { 
                ...(masterEventSnapshot.instanceAttendees || {}), 
                [currentEvent.date]: newAttendees, 
            };
        } else {
            updatePayload.attendees = newAttendees;
        }
        
        const result = await updateMasterEvent(masterEventToUpdateId, updatePayload, currentUser.uid, hostingGroupInfo.id);
        
        if (!result.success) {
            // Revert on error
            setIsAttending(prevIsAttending);
            setAttendeeCount(prevAttendeeCount);
            setCurrentEvent(prev => prev ? { ...prev, attendees: prevAttendees } : null);
            toast({ title: t.error, description: result.message || t.errorUpdateRsvp, variant: "destructive"});
        } else {
            // Silent refresh of attendee names/avatars if count increased
            if (newIsAttending) {
                const details = await S_getMultipleContactableUserDetails(newAttendees);
                setAttendeeDetails(details);
            }
        }
    } catch (e: any) {
        // Revert on unexpected error
        setIsAttending(prevIsAttending);
        setAttendeeCount(prevAttendeeCount);
        setCurrentEvent(prev => prev ? { ...prev, attendees: prevAttendees } : null);
        toast({ title: t.error, description: t.errorUpdateRsvp, variant: "destructive"});
    }
  };

  const handleOpenAttendeeDialog = async (event: Event) => {
    setCurrentDialogEventId(event.id);
    const eventAttendees = event.attendees || [];
    if (eventAttendees.length > 0) {
        if (!attendeeDetails[eventAttendees[0]]) { // Basic check if we need to fetch
            setIsLoadingAttendees(true);
            try {
                const details = await S_getMultipleContactableUserDetails(eventAttendees);
                setAttendeeDetails(prev => ({ ...prev, ...details }));
            } catch (e) {
                console.error("Error fetching attendee details for dialog:", e);
            }
            setIsLoadingAttendees(false);
        }
    }
  };

  const handleDeleteMasterEvent = async () => { 
    if (!canManageMasterEvent || !currentEvent || currentEvent.isInstance || !hostingGroupInfo || !currentUser) { toast({ title: "Permission Denied or Invalid Action", variant: "destructive" }); return; }
    const masterIdToDelete = currentEvent.id; 
    const result = await deleteMasterEvent(masterIdToDelete, currentUser.uid, hostingGroupInfo.id);
    if (result.success) { toast({ title: t.deleteEvent, description: `Event "${currentEvent.name}" has been deleted.` }); router.push(`/groups/${currentEvent.groupId}`); }
    else { toast({ title: t.error, description: result.message || "Could not delete event.", variant: "destructive" }); }
  };

  const handleToggleCancelEvent = async () => {
    if (!canManageMasterEvent || !currentEvent || !currentUser || !hostingGroupInfo) { toast({ title: t.permissionDenied, variant: "destructive" }); return; }
    if (eventIsPast && !eventIsCancelled) { toast({ title: t.actionNotAllowed, description: "Cannot cancel a past event unless reactivating.", variant: "destructive"}); return; }
    const newCancelStatus = !eventIsCancelled;
    const masterEventToUpdateId = currentEvent.masterEventId || currentEvent.id;
    const masterEventSnapshot = await getMasterEventById(masterEventToUpdateId);
    if (!masterEventSnapshot) { toast({ title: t.error, description: "Master event not found for update.", variant: "destructive"}); return; }
    const updatePayload: Partial<Omit<Event, 'id' | 'groupId'>> = {};
    if (currentEvent.isInstance) { updatePayload.instanceMetadata = { ...(masterEventSnapshot.instanceMetadata || {}), [currentEvent.date]: { ...masterEventSnapshot.instanceMetadata?.[currentEvent.date], isCancelled: newCancelStatus }, }; }
    else { updatePayload.isCancelled = newCancelStatus; }
    const result = await updateMasterEvent(masterEventToUpdateId, updatePayload, currentUser.uid, hostingGroupInfo.id);
    if (result.success) { setCurrentEvent(prev => prev ? { ...prev, isCancelled: newCancelStatus } : null); setEventIsCancelled(newCancelStatus); toast({ title: newCancelStatus ? t.cancelledEvent : t.reactivateEvent }); }
    else { toast({ title: t.error, description: result.message || "Could not update cancellation status.", variant: "destructive"}); }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: t.linkCopied, description: t.linkCopiedDesc });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({ title: "Error", description: "Could not copy link.", variant: "destructive" });
    });
  };

  const handleShareToWhatsApp = () => {
    if (!currentEvent) return;
    const eventName = currentEvent.name;
    const url = window.location.href;
    const text = encodeURIComponent(`Check out this event on GroupHub: "${eventName}"\n\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
};


  const pageActions = (
    <div className="flex gap-2 items-center">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline"><Share2 className="mr-2 h-4 w-4" /> {t.share}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={handleCopyLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>{t.copyLink}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleShareToWhatsApp}>
                    <WhatsAppIcon className="mr-2 h-4 w-4" />
                    <span>{t.shareToWhatsApp}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      {canManageMasterEvent && (
        <>
          <Button variant="outline" asChild disabled={eventIsPast && !currentEvent?.isRecurring && !eventIsCancelled}>
            <Link href={`/events/${currentEvent?.masterEventId || currentEvent?.id}/edit`}>
              <Edit3 className="mr-2 h-4 w-4" /> {t.edit}
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant={eventIsCancelled ? "secondary" : "outline"} className={eventIsCancelled ? "border-yellow-500 text-yellow-700 hover:bg-yellow-100" : "border-destructive text-destructive hover:bg-destructive/10" } disabled={eventIsPast && !eventIsCancelled}>
                {eventIsCancelled ? <CheckSquare className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />} {eventIsCancelled ? t.reactivateEvent : t.cancelEvent}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{eventIsCancelled ? t.reactivateConfirm(currentEvent?.name || '') : t.cancelConfirm(currentEvent?.name || '')}</AlertDialogTitle>
                <AlertDialogDescription>{eventIsCancelled ? t.reactivateDesc : t.cancelDesc} {t.areYouSure}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.noKeep}</AlertDialogCancel>
                <AlertDialogAction onClick={handleToggleCancelEvent} className={eventIsCancelled ? "bg-green-600 hover:bg-green-700 text-white" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}>
                  {eventIsCancelled ? t.yesReactivate : t.yesCancel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={currentEvent?.isInstance}>
                <Trash2 className="mr-2 h-4 w-4" /> {currentEvent?.isInstance ? t.deleteSeries : t.deleteEvent}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{currentEvent?.isInstance ? t.deleteSeriesConfirm(currentEvent.name) : t.deleteEventConfirm(currentEvent?.name || '')}</AlertDialogTitle>
                <AlertDialogDescription>{currentEvent?.isRecurring && !currentEvent?.isInstance ? t.deleteDescRecurring : t.deleteDesc}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMasterEvent} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{t.delete}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
       {currentUser && currentEvent && (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setReportDialogOpen(true)}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <span>{t.reportEvent}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
       )}
    </div>
  );

  if (loading || authLoading) { return (<PageShell title={t.loading} description={t.pleaseWait}><Card className="w-full max-w-3xl mx-auto shadow-lg"><div className="relative h-64 md:h-80 w-full bg-muted animate-pulse rounded-t-lg" /><CardHeader><div className="h-8 w-3/4 bg-muted animate-pulse mb-2 rounded" /><div className="h-4 w-1/2 bg-muted animate-pulse rounded" /></CardHeader><CardContent className="space-y-4"><div className="h-4 w-full bg-muted animate-pulse rounded" /><div className="h-4 w-5/6 bg-muted animate-pulse rounded" /><div className="h-4 w-full bg-muted animate-pulse rounded" /><div className="h-10 w-full bg-muted animate-pulse rounded" /><div className="h-20 w-full bg-muted animate-pulse rounded" /></CardContent></Card></PageShell>); }
  if (accessDeniedMessage) { return (<PageShell title={t.accessDenied} description={t.cannotEdit}><Card className="w-full max-w-md mx-auto text-center py-10 shadow-md"><CardHeader>{accessDeniedMessage.toLowerCase().includes("private") ? <LockIcon className="mx-auto h-12 w-12 text-destructive mb-4" /> : <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />}<CardTitle>{accessDeniedMessage.toLowerCase().includes("not found") ? t.eventNotFoundTitle : t.permissionDenied}</CardTitle><CardDescription>{accessDeniedMessage}</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={currentEvent?.id ? `/events/${currentEvent.id}` : "/events"}><ArrowLeft className="mr-2 h-4 w-4" /> {t.backToEvents}</Link></Button></CardContent></Card></PageShell>); }
  if (!currentEvent || !hostingGroupInfo) { return (<PageShell title={t.eventNotFoundTitle} description={t.sorryNotFound}><Card className="w-full max-w-md mx-auto text-center py-10 shadow-md"><CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>{t.oopsMissing}</CardTitle><CardDescription>{t.idMismatch(eventId)}</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href="/events"><ArrowLeft className="mr-2 h-4 w-4" /> {t.backToEvents}</Link></Button></CardContent></Card></PageShell>); }

  const eventDateFormatted = format(new Date(currentEvent.date + 'T00:00:00Z'), 'PPPP');
  const imageSrc = currentEvent.image || DEFAULT_EVENT_IMAGE;
  
  const renderRsvpButton = () => {
    if (eventIsPast || eventIsCancelled) { return (<Button size="lg" className="w-full md:w-auto" disabled>{eventIsCancelled ? <XCircle className="mr-2 h-5 w-5" /> : <Archive className="mr-2 h-5 w-5" />}{eventIsCancelled ? t.eventCancelledStatus : t.eventPassedStatus}</Button>); }
    if (!currentUser) {
      return (
        <Button asChild size="lg" className="w-full md:w-auto">
          <Link href={`/login?redirect=/events/${currentEvent.id}`}>
            <LogIn className="mr-2 h-5 w-5" /> {t.loginToRsvp}
          </Link>
        </Button>
      );
    }
    if (isMemberOfHostingGroup) { return (<Button onClick={handleRsvpToggle} size="lg" className="w-full md:w-auto">{isAttending ? (<><UserCheck className="mr-2 h-5 w-5" /> {t.attending}</>) : (<><UserPlus className="mr-2 h-5 w-5" /> {t.attendEvent}</>)}</Button>); }
    if (hostingGroupInfo.isPublic) { return (<Button onClick={handleJoinAndRsvp} size="lg" className="w-full md:w-auto" disabled={loading}><UserPlus className="mr-2 h-5 w-5" /> {t.joinAndAttend}</Button>); }
    return (<p className="text-xs text-destructive mt-1 flex items-center"><ShieldQuestion className="h-4 w-4 mr-1.5" />{t.mustBeMemberRsvp(hostingGroupInfo.name)} <Link href={`/groups/${currentEvent.groupId}`} className="ml-1 underline hover:text-primary">{t.viewGroup}</Link></p>);
  };

  return (
    <PageShell title={currentEvent.name} description={currentEvent.isInstance ? `Instance of a recurring event. Hosted by ${hostingGroupInfo.name}.` : `Details for the event: ${currentEvent.name}`} actions={pageActions}>
      <div className="mb-6"><Button variant="outline" asChild><Link href="/events"><ArrowLeft className="mr-2 h-4 w-4" /> {t.backToEvents}</Link></Button></div>
      <Card className="w-full max-w-3xl mx-auto shadow-xl overflow-hidden rounded-lg">
        <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16 md:h-20 md:w-20 border">
              <AvatarImage src={imageSrc} alt={currentEvent.name} />
              <AvatarFallback>{currentEvent.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="font-headline text-3xl md:text-4xl">{currentEvent.name}</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-base">
            <div className="flex items-start"><CalendarDays className="h-6 w-6 mr-3 text-primary shrink-0 mt-1" /><div><p className="font-semibold">{t.dateAndTime}</p><p className="text-muted-foreground">{eventDateFormatted} {currentEvent.time ? `${t.at} ${currentEvent.time}` : t.timeNotSpecified} {currentEvent.duration ? t.duration(currentEvent.duration) : ''}</p></div></div>
            <div className="flex items-start"><MapPin className="h-6 w-6 mr-3 text-primary shrink-0 mt-1" /><div><p className="font-semibold">{t.location}</p><p className="text-muted-foreground">{currentEvent.location || t.notSpecified}</p></div></div>
            <div className="flex items-start"><Users className="h-6 w-6 mr-3 text-primary shrink-0 mt-1" /><div><p className="font-semibold">{t.hostedBy}</p><Link href={`/groups/${currentEvent.groupId}`} className="text-muted-foreground hover:text-primary hover:underline">{hostingGroupInfo.name}</Link></div></div>
             <div className="flex items-start"><Users2 className="h-6 w-6 mr-3 text-primary shrink-0 mt-1" /><div><p className="font-semibold">{t.attendees}</p><p className="text-muted-foreground">{t.personAttending(attendeeCount)}</p>
            {attendeeCount > 0 && (<AlertDialog onOpenChange={(open) => { if (open) handleOpenAttendeeDialog(currentEvent); else setCurrentDialogEventId(null); }}>
                <AlertDialogTrigger asChild><Button variant="link" className="p-0 h-auto text-sm text-primary hover:underline">{t.viewAttendees}</Button></AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t.attendeesFor(currentEvent.name, eventDateFormatted)}</AlertDialogTitle><AlertDialogDescription>{t.attendeesDesc}</AlertDialogDescription></AlertDialogHeader>
                    <ScrollArea className="h-[200px] rounded-md border p-2">
                        {isLoadingAttendees && currentDialogEventId === currentEvent.id ? (<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>)
                        : currentEvent.attendees.length === 0 ? (<p className="text-muted-foreground text-center p-4">{t.noRsvps}</p>)
                        : (<div className="space-y-2">{currentEvent.attendees.map((attendeeId) => {
                            const userDetail = attendeeDetails[attendeeId];
                            const isViewingOwnAttendance = currentUser && attendeeId === currentUser.uid;
                            
                            let nameToDisplay: string;
                            let avatarSrc: string;
                            let avatarFallbackChar: string;

                            if (isViewingOwnAttendance && currentUser) {
                                nameToDisplay = currentUser.displayName || currentUser.email?.split('@')[0] || t.you;
                                avatarSrc = attendeeDetails[currentUser.uid]?.avatar || getDefaultVercelAvatar(currentUser.email || currentUser.uid);
                                avatarFallbackChar = (currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0) || "Y").toUpperCase();
                            } else if (userDetail) {
                                nameToDisplay = userDetail.name;
                                avatarSrc = userDetail.avatar;
                                avatarFallbackChar = userDetail.name.charAt(0).toUpperCase();
                            } else {
                                nameToDisplay = t.user(attendeeId); 
                                avatarSrc = getDefaultVercelAvatar(attendeeId);
                                avatarFallbackChar = "U";
                            }
                            return (<div key={attendeeId} className={`flex items-center gap-2 p-2 rounded-md ${isViewingOwnAttendance ? 'bg-secondary': ''}`}><Avatar className="h-8 w-8"><AvatarImage src={avatarSrc} /><AvatarFallback>{avatarFallbackChar}</AvatarFallback></Avatar><span className="font-medium">{nameToDisplay}</span>{isViewingOwnAttendance && <span className="text-xs text-primary">{t.you}</span>}</div>);
                        })}</div>)}
                    </ScrollArea>
                    <AlertDialogFooter><AlertDialogCancel>{t.close}</AlertDialogCancel></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>)}</div></div></div>
          <div className="pt-4 border-t"><h3 className="font-semibold text-lg mb-2">{t.aboutEvent}</h3><p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{currentEvent.description || t.noDescription}</p></div>
          <div className="pt-6 border-t">{renderRsvpButton()}{isMemberOfHostingGroup && attendeeCount > 0 && (isAttending ? (<p className="text-sm text-green-600 mt-2 flex items-center"><CheckCircle className="h-4 w-4 mr-1.5"/> {t.confirmedRsvp}</p>) : (<p className="text-sm text-muted-foreground mt-2 flex items-center"><Info className="h-4 w-4 mr-1.5"/> {t.notAttending}</p>))}</div>
        </CardContent>
      </Card>
      {currentUser && currentEvent && (
        <ReportDialog 
          open={reportDialogOpen} 
          onOpenChange={setReportDialogOpen}
          entityId={currentEvent.id} 
          entityType="event" 
          entityLink={`/events/${currentEvent.id}`}
        >
          <></>
        </ReportDialog>
      )}
    </PageShell>
  );
}
