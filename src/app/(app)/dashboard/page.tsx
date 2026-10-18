
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Users, MessageSquare, CalendarDays, Loader2, Compass, Search, Trash2, ShieldAlert, Info, UserPlus, RotateCw, Brain } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Event as StoredEvent, Group as StoredGroup, Conversation, ContactableUser } from "@/types";
import { generateEventOccurrences, isEventInstancePast as isDatePast } from "@/lib/event-utils";
import { addMonths, startOfDay, formatISO, parseISO } from "date-fns";
import { S_getMemberGroups } from '@/actions/group-actions';
import { S_getAttendingEvents } from '@/actions/event-actions';
import { S_getConversations } from '@/actions/message-actions';
import { cleanupDeletedUsersFromGroups } from '@/actions/admin-actions';
import { getFriendSuggestions } from '@/actions/suggestion-actions';
import { S_sendFriendRequest } from '@/actions/friend-actions';
import { S_getLatestForumActivity, type LatestForumActivity } from '@/actions/forum-actions';
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TimeAgo } from '@/components/shared/TimeAgo';


interface Group extends StoredGroup {}
interface Event extends StoredEvent {}

interface Suggestion extends ContactableUser {
  reason: string;
  score: number;
}

interface SummaryData {
  groups: number;
  upcomingEvents: number;
  unreadMessages: number;
}

const translations = {
  en: {
    dashboardTitle: "Dashboard",
    dashboardDescription: "Welcome back! Here's a quick overview of your GroupHub activity.",
    myGroups: "My Groups",
    myGroupsDescription: "Active groups you are part of.",
    viewMyGroups: "View My Groups",
    noGroups: "You're not a member of any groups yet.",
    discoverGroups: "Discover Groups",
    upcomingEvents: "Upcoming Events",
    attendingEventsDescription: "Events you have RSVP'd to.",
    viewAllEvents: "View All Events",
    noAttendingEvents: "You aren't attending any upcoming events.",
    exploreEvents: "Explore Events",
    unreadMessages: "Unread Messages",
    unreadMessagesDescription: "New messages in your DMs and group boards.",
    noNewMessages: "No new messages.",
    viewMessages: "View Messages",
    quickActions: "Quick Actions",
    quickActionsDescription: "Start something new quickly.",
    createNewGroup: "Create New Group",
    postInForums: "Post in Forums",
    scheduleNewEvent: "Schedule New Event",
    joinToSchedule: "Join or create a group to schedule events.",
    adminToSchedule: "To schedule events, you need to be an admin or creator of one of your groups.",
    cleanup: "Clean-up Deleted Users",
    cleaning: "Cleaning...",
    cleanupStarted: "Cleanup Started",
    cleanupScanning: "Scanning all groups for deleted users. This may take a moment.",
    cleanupSuccess: "Cleanup Successful",
    cleanupFailed: "Cleanup Failed",
    cleanupError: "Cleanup Error",
    friendSuggestions: "Friend Suggestions",
    friendSuggestionsDesc: "People you might know.",
    noSuggestions: "No suggestions right now. Check back later!",
    addFriend: "Add Friend",
    requestSent: "Request Sent",
    errorSendingRequest: "Error sending request.",
    refreshSuggestions: "Refresh Suggestions",
    latestForumActivity: "Latest Forum Activity",
    latestForumActivityDesc: "Quickly jump into the latest conversations.",
    noForumActivity: "No forum activity yet. Be the first to start a discussion!",
    inForum: "in",
  },
  es: {
    dashboardTitle: "Panel de Control",
    dashboardDescription: "¡Bienvenido de nuevo! Aquí tienes un resumen rápido de tu actividad en GroupHub.",
    myGroups: "Mis Grupos",
    myGroupsDescription: "Grupos activos de los que eres miembro.",
    viewMyGroups: "Ver Mis Grupos",
    noGroups: "Aún no eres miembro de ningún grupo.",
    discoverGroups: "Descubrir Grupos",
    upcomingEvents: "Próximos Eventos",
    attendingEventsDescription: "Eventos a los que has confirmado asistencia.",
    viewAllEvents: "Ver Todos los Eventos",
    noAttendingEvents: "No vas a asistir a ningún evento próximo.",
    exploreEvents: "Explorar Eventos",
    unreadMessages: "Mensajes no Leídos",
    unreadMessagesDescription: "Nuevos mensajes en tus chats directos y de grupo.",
    noNewMessages: "No hay mensajes nuevos.",
    viewMessages: "Ver Mensajes",
    quickActions: "Acciones Rápidas",
    quickActionsDescription: "Comienza algo nuevo rápidamente.",
    createNewGroup: "Crear Nuevo Grupo",
    postInForums: "Publicar en Foros",
    scheduleNewEvent: "Programar Nuevo Evento",
    joinToSchedule: "Únete o crea un grupo para programar eventos.",
    adminToSchedule: "Para programar eventos, necesitas ser administrador o creador de uno de tus grupos.",
    cleanup: "Limpiar Usuarios Eliminados",
    cleaning: "Limpiando...",
    cleanupStarted: "Limpieza Iniciada",
    cleanupScanning: "Escaneando todos los grupos en busca de usuarios eliminados. Esto puede tardar un momento.",
    cleanupSuccess: "Limpieza Exitosa",
    cleanupFailed: "La Limpieza Falló",
    cleanupError: "Error de Limpieza",
    friendSuggestions: "Sugerencias de Amigos",
    friendSuggestionsDesc: "Personas que quizás conozcas.",
    noSuggestions: "No hay sugerencias por ahora. ¡Vuelve más tarde!",
    addFriend: "Añadir Amigo",
    requestSent: "Solicitud Enviada",
    errorSendingRequest: "Error al enviar la solicitud.",
    refreshSuggestions: "Actualizar Sugerencias",
    latestForumActivity: "Actividad Reciente del Foro",
    latestForumActivityDesc: "Entra rápidamente en las últimas conversaciones.",
    noForumActivity: "Aún no hay actividad en el foro. ¡Sé el primero en iniciar una discusión!",
    inForum: "en",
  },
  pt: {
    dashboardTitle: "Painel",
    dashboardDescription: "Bem-vindo de volta! Aqui está uma visão geral rápida da sua atividade no GroupHub.",
    myGroups: "Meus Grupos",
    myGroupsDescription: "Grupos ativos dos quais você é membro.",
    viewMyGroups: "Ver Meus Grupos",
    noGroups: "Você ainda não é membro de nenhum grupo.",
    discoverGroups: "Descobrir Grupos",
    upcomingEvents: "Próximos Eventos",
    attendingEventsDescription: "Eventos para os quais você confirmou presença.",
    viewAllEvents: "Ver Todos os Eventos",
    noAttendingEvents: "Você não participará de nenhum evento futuro.",
    exploreEvents: "Explorar Eventos",
    unreadMessages: "Mensagens Não Lidas",
    unreadMessagesDescription: "Novas mensagens em seus DMs e quadros de grupo.",
    noNewMessages: "Nenhuma mensagem nova.",
    viewMessages: "Ver Mensagens",
    quickActions: "Ações Rápidas",
    quickActionsDescription: "Comece algo novo rapidamente.",
    createNewGroup: "Criar Novo Grupo",
    postInForums: "Postar nos Fóruns",
    scheduleNewEvent: "Agendar Novo Evento",
    joinToSchedule: "Junte-se ou crie um grupo para agendar eventos.",
    adminToSchedule: "Para agendar eventos, você precisa ser administrador ou criador de um de seus grupos.",
    cleanup: "Limpar Usuários Excluídos",
    cleaning: "Limpando...",
    cleanupStarted: "Limpeza Iniciada",
    cleanupScanning: "Verificando todos os grupos em busca de usuários excluídos. Isso pode levar um momento.",
    cleanupSuccess: "Limpeza Concluída com Sucesso",
    cleanupFailed: "Falha na Limpeza",
    cleanupError: "Erro na Limpeza",
    friendSuggestions: "Sugestões de Amigos",
    friendSuggestionsDesc: "Pessoas que você talvez conheça.",
    noSuggestions: "Nenhuma sugestão no momento. Volte mais tarde!",
    addFriend: "Adicionar Amigo",
    requestSent: "Solicitação Enviada",
    errorSendingRequest: "Erro ao enviar solicitação.",
    refreshSuggestions: "Atualizar Sugestões",
    latestForumActivity: "Atividade Reciente do Fórum",
    latestForumActivityDesc: "Entre rapidamente nas últimas conversas.",
    noForumActivity: "Nenhuma atividade no fórum ainda. Seja o primeiro a iniciar uma discussão!",
    inForum: "em",
  },
  fr: {
    dashboardTitle: "Tableau de Bord",
    dashboardDescription: "Bienvenue à nouveau ! Voici un aperçu rapide de votre activité sur GroupHub.",
    myGroups: "Mes Groupes",
    myGroupsDescription: "Groupes actifs dont vous faites partie.",
    viewMyGroups: "Voir Mes Groupes",
    noGroups: "Vous n'êtes membre d'aucun groupe pour le moment.",
    discoverGroups: "Découvrir des Groupes",
    upcomingEvents: "Événements à Venir",
    attendingEventsDescription: "Événements auxquels vous participez.",
    viewAllEvents: "Voir Tous les Événements",
    noAttendingEvents: "Vous ne participez à aucun événement à venir.",
    exploreEvents: "Explorer les Événements",
    unreadMessages: "Messages non Lus",
    unreadMessagesDescription: "Nouveaux messages dans vos DMs et forums de groupe.",
    noNewMessages: "Aucun nouveau message.",
    viewMessages: "Voir les Messages",
    quickActions: "Actions Rapides",
    quickActionsDescription: "Commencez quelque chose de nouveau rapidement.",
    createNewGroup: "Créer un Nouveau Groupe",
    postInForums: "Publier sur les Forums",
    scheduleNewEvent: "Programmer un Nouvel Événement",
    joinToSchedule: "Rejoignez ou créez un groupe pour programmer des événements.",
    adminToSchedule: "Pour programmer des événements, vous devez être administrateur ou créateur d'un de vos groupes.",
    cleanup: "Nettoyer les Utilisateurs Supprimés",
    cleaning: "Nettoyage en cours...",
    cleanupStarted: "Nettoyage Démarré",
    cleanupScanning: "Analyse de tous les groupes à la recherche d'utilisateurs supprimés. Cela peut prendre un moment.",
    cleanupSuccess: "Nettoyage Réussi",
    cleanupFailed: "Le Nettoyage a Échoué",
    cleanupError: "Erreur de Nettoyage",
    friendSuggestions: "Suggestions d'Amis",
    friendSuggestionsDesc: "Personnes que vous pourriez connaître.",
    noSuggestions: "Aucune suggestion pour le moment. Revenez plus tard !",
    addFriend: "Ajouter un ami",
    requestSent: "Demande envoyée",
    errorSendingRequest: "Erreur lors de l'envoi de la demande.",
    refreshSuggestions: "Rafraîchir les Suggestions",
    latestForumActivity: "Activité Récente du Forum",
    latestForumActivityDesc: "Entrez rapidement dans les dernières conversations.",
    noForumActivity: "Aucune activité sur le forum pour le moment. Soyez le premier à lancer une discussion !",
    inForum: "dans",
  },
  de: {
    dashboardTitle: "Dashboard",
    dashboardDescription: "Willkommen zurück! Hier ist eine schnelle Übersicht deiner GroupHub-Aktivitäten.",
    myGroups: "Meine Gruppen",
    myGroupsDescription: "Aktive Gruppen, in denen du Mitglied bist.",
    viewMyGroups: "Meine Gruppen ansehen",
    noGroups: "Du bist noch kein Mitglied in einer Gruppe.",
    discoverGroups: "Gruppen entdecken",
    upcomingEvents: "Anstehende Termine",
    attendingEventsDescription: "Veranstaltungen, zu denen du zugesagt hast.",
    viewAllEvents: "Alle Termine ansehen",
    noAttendingEvents: "Du nimmst an keinen bevorstehenden Veranstaltungen teil.",
    exploreEvents: "Termine erkunden",
    unreadMessages: "Ungelesene Nachrichten",
    unreadMessagesDescription: "Neue Nachrichten in deinen DMs und Gruppenforen.",
    noNewMessages: "Keine neuen Nachrichten.",
    viewMessages: "Nachrichten ansehen",
    quickActions: "Schnellaktionen",
    quickActionsDescription: "Schnell etwas Neues starten.",
    createNewGroup: "Neue Gruppe erstellen",
    postInForums: "In Foren posten",
    scheduleNewEvent: "Neuen Termin planen",
    joinToSchedule: "Tritt einer Gruppe bei oder erstelle eine, um Termine zu planen.",
    adminToSchedule: "Um Termine zu planen, musst du Admin oder Ersteller einer deiner Gruppen sein.",
    cleanup: "Gelöschte Benutzer bereigen",
    cleaning: "Bereinigung läuft...",
    cleanupStarted: "Bereinigung gestartet",
    cleanupScanning: "Alle Gruppen werden nach gelöschten Benutzern durchsucht. Das kann einen Moment dauern.",
    cleanupSuccess: "Bereinigung erfolgreich",
    cleanupFailed: "Bereinigung fehlgeschlagen",
    cleanupError: "Fehler bei der Bereinigung",
    friendSuggestions: "Freundesvorschläge",
    friendSuggestionsDesc: "Leute, die du vielleicht kennst.",
    noSuggestions: "Im Moment keine Vorschläge. Schau später wieder vorbei!",
    addFriend: "Freund hinzufügen",
    requestSent: "Anfrage gesendet",
    errorSendingRequest: "Fehler beim Senden der Anfrage.",
    refreshSuggestions: "Vorschläge Aktualisieren",
    latestForumActivity: "Neueste Forum-Activity",
    latestForumActivityDesc: "Springen Sie schnell in die neuesten Gespräche.",
    noForumActivity: "Noch keine Forum-Activity. Seien Sie der Erste, der eine Diskussion startet!",
    inForum: "in",
  },
  it: {
    dashboardTitle: "Cruscotto",
    dashboardDescription: "Bentornato! Ecco una rapida panoramica della tua attività su GroupHub.",
    myGroups: "I Miei Gruppi",
    myGroupsDescription: "Gruppi attivi di cui fai parte.",
    viewMyGroups: "Vedi I Miei Gruppi",
    noGroups: "Non sei ancora membro di nessun gruppo.",
    discoverGroups: "Scopri Gruppi",
    upcomingEvents: "Eventi imminenti",
    attendingEventsDescription: "Eventi a cui hai confermato la partecipazione.",
    viewAllEvents: "Vedi Tutti gli Eventi",
    noAttendingEvents: "Non parteciperai a nessun evento imminente.",
    exploreEvents: "Esplora Eventi",
    unreadMessages: "Messaggi non Letti",
    unreadMessagesDescription: "Nuovi messaggi nei tuoi DM e nelle bacheche di gruppo.",
    noNewMessages: "Nessun nuovo messaggio.",
    viewMessages: "Vedi Messaggi",
    quickActions: "Azioni Rapide",
    quickActionsDescription: "Inizia qualcosa di nuevo rapidamente.",
    createNewGroup: "Crea Nuovo Gruppo",
    postInForums: "Pubblica nei Forum",
    scheduleNewEvent: "Pianifica Nuovo Evento",
    joinToSchedule: "Unisciti o crea un gruppo per pianificare eventi.",
    adminToSchedule: "Per pianificare eventi, devi essere un amministratore o il creatore di uno dei tuoi gruppi.",
    cleanup: "Pulisci Utenti Cancellati",
    cleaning: "Pulizia in corso...",
    cleanupStarted: "Pulizia Avviata",
    cleanupScanning: "Scansione di tutti i gruppi per utenti cancellati. Potrebbe richiedere un momento.",
    cleanupSuccess: "Pulizia Riuscita",
    cleanupFailed: "Pulizia Fallita",
    cleanupError: "Errore di Pulizia",
    friendSuggestions: "Suggerimenti di Amici",
    friendSuggestionsDesc: "Persone che potresti conoscere.",
    noSuggestions: "Nessun suggerimento per ora. Torna più tardi!",
    addFriend: "Aggiungi Amico",
    requestSent: "Richiesta Inviata",
    errorSendingRequest: "Errore nell'invio della richiesta.",
    refreshSuggestions: "Aggiorna Suggerimenti",
    latestForumActivity: "Attività Recente del Forum",
    latestForumActivityDesc: "Entra rapidamente nelle ultime conversazioni.",
    noForumActivity: "Nessuna attività nel forum ancora. Sii il primo a iniziare una discussione!",
    inForum: "in",
  },
  ru: {
    dashboardTitle: "Панель управления",
    dashboardDescription: "С возвращением! Вот краткий обзор вашей активности в GroupHub.",
    myGroups: "Мои группы",
    myGroupsDescription: "Активные группы, в которых вы состоите.",
    viewMyGroups: "Просмотреть мои группы",
    noGroups: "Вы еще не являетесь участником каких-либо групп.",
    discoverGroups: "Найти группы",
    upcomingEvents: "Предстоящие события",
    attendingEventsDescription: "События, которые вы посетите.",
    viewAllEvents: "Посмотреть все события",
    noAttendingEvents: "Вы не посещаете предстоящих событий.",
    exploreEvents: "Изучить события",
    unreadMessages: "Непрочитанные сообщения",
    unreadMessagesDescription: "Новые сообщения в личных чатах и на досках групп.",
    noNewMessages: "Нет новых сообщений.",
    viewMessages: "Посмотреть сообщения",
    quickActions: "Быстрые действия",
    quickActionsDescription: "Начните что-то новое быстро.",
    createNewGroup: "Создать новую группу",
    postInForums: "Опубликовать на форумах",
    scheduleNewEvent: "Запланировать новое событие",
    joinToSchedule: "Присоединитесь к группе или создайте ее, чтобы планировать события.",
    adminToSchedule: "Чтобы планировать события, вы должны быть администратором или создателем одной из ваших групп.",
    cleanup: "Очистить удаленных пользователей",
    cleaning: "Очистка...",
    cleanupStarted: "Очистка начата",
    cleanupScanning: "Сканирование всех групп на наличие удаленных пользователей. Это может занять некоторое время.",
    cleanupSuccess: "Очистка прошла успешно",
    cleanupFailed: "Ошибка очистки",
    cleanupError: "Ошибка при очистке",
    friendSuggestions: "Возможные друзья",
    friendSuggestionsDesc: "Люди, которых вы можете знать.",
    noSuggestions: "Пока нет предложений. Загляните позже!",
    addFriend: "Добавить в друзья",
    requestSent: "Запрос отправлен",
    errorSendingRequest: "Ошибка при отправке запроса.",
    refreshSuggestions: "Обновить рекомендации",
    latestForumActivity: "Последняя активность на форуме",
    latestForumActivityDesc: "Быстро присоединяйтесь к последним обсуждениям.",
    noForumActivity: "Пока нет активности на форуме. Будьте первым, кто начнет обсуждение!",
    inForum: "в",
  }
};


export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');
  const isOwner = currentUser?.uid === process.env.NEXT_PUBLIC_OWNER_UID;
  
  const [summary, setSummary] = useState<SummaryData>({
    groups: 0,
    upcomingEvents: 0,
    unreadMessages: 0,
  });
  const [friendSuggestions, setFriendSuggestions] = useState<Suggestion[]>([]);
  const [latestForumActivity, setLatestForumActivity] = useState<LatestForumActivity[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [isLoadingForumActivity, setIsLoadingForumActivity] = useState(true);
  
  const [isMemberOfAnyGroup, setIsMemberOfAnyGroup] = useState(false);
  const [canScheduleAnyEvent, setCanScheduleAnyEvent] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split('-')[0];
      if (translations[browserLang as keyof typeof translations]) setLang(browserLang as any);
    }
  }, []);

  const t = translations[lang] || translations['en'];
  
  useEffect(() => {
    document.title = `${t.dashboardTitle} | GroupHub`;
  }, [t]);

  const fetchSummaryData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingSummary(true);
    try {
        const [memberGroups, attendingMasterEvents, userConvos] = await Promise.all([
            S_getMemberGroups(currentUser.uid),
            S_getAttendingEvents(currentUser.uid),
            S_getConversations(currentUser.uid)
        ]);

        const userIsMemberOfAnyGroupFlag = memberGroups.length > 0;
        const userCanScheduleFlag = memberGroups.some(g => 
            (g.adminIds.includes(currentUser.uid) || g.creatorId === currentUser.uid)
        );
        
        setIsMemberOfAnyGroup(userIsMemberOfAnyGroupFlag);
        setCanScheduleAnyEvent(userCanScheduleFlag);

        const today = startOfDay(new Date());
        const rangeEnd = addMonths(today, 12);
        let upcomingCount = 0;

        attendingMasterEvents.forEach(masterEvent => {
            if (masterEvent.isRecurring && masterEvent.recurrence) {
                const instances = generateEventOccurrences(masterEvent, today, rangeEnd);
                instances.forEach(instance => {
                    const instanceDateStr = instance.date;
                    const attendees = instance.attendees || [];
                    const isCancelled = masterEvent.instanceMetadata?.[instanceDateStr]?.isCancelled ?? masterEvent.isCancelled ?? false;
                    
                    if (attendees.includes(currentUser.uid) && !isCancelled) {
                        upcomingCount++;
                    }
                });
            } else {
                if (!isDatePast(masterEvent.date) && !masterEvent.isCancelled) {
                    upcomingCount++;
                }
            }
        });

        const totalUnreadMessages = userConvos.reduce((sum, convo) => {
            if (convo.lastMessageSenderId !== currentUser.uid && convo.unreadCount > 0) {
                return sum + convo.unreadCount;
            }
            return sum;
        }, 0);

        setSummary({ 
            groups: memberGroups.length, 
            upcomingEvents: upcomingCount, 
            unreadMessages: totalUnreadMessages 
        });
    } catch (e) {
        console.error("Error fetching summary data:", e);
    } finally {
        setIsLoadingSummary(false);
    }
  }, [currentUser]);

  const fetchSuggestions = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingSuggestions(true);
    try {
        const suggestions = await getFriendSuggestions(currentUser.uid);
        setFriendSuggestions(suggestions);
    } catch (e) {
        console.error("Error fetching suggestions:", e);
    } finally {
        setIsLoadingSuggestions(false);
    }
  }, [currentUser]);

  const fetchForumActivity = useCallback(async () => {
    setIsLoadingForumActivity(true);
    try {
        const forumActivity = await S_getLatestForumActivity(5);
        setLatestForumActivity(forumActivity);
    } catch (e) {
        console.error("Error fetching forum activity:", e);
    } finally {
        setIsLoadingForumActivity(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && currentUser) {
        fetchSummaryData();
        fetchSuggestions();
        fetchForumActivity();
    }
  }, [currentUser, authLoading, fetchSummaryData, fetchSuggestions, fetchForumActivity]);

  useEffect(() => {
    const handleStorageChange = () => {
      fetchSummaryData();
      fetchSuggestions();
    };
    window.addEventListener('storageUpdated', handleStorageChange);
    return () => window.removeEventListener('storageUpdated', handleStorageChange);
  }, [fetchSummaryData, fetchSuggestions]);

  const handleCleanup = async () => {
    if (!currentUser) return;
    setIsCleaning(true);
    toast({ title: t.cleanupStarted, description: t.cleanupScanning });
    try {
        const result = await cleanupDeletedUsersFromGroups(currentUser.uid);
        if (result.success) toast({ title: t.cleanupSuccess, description: result.message });
        else toast({ title: t.cleanupFailed, description: result.message, variant: "destructive" });
    } catch (error) {
        toast({ title: t.cleanupError, description: String(error), variant: "destructive" });
    } finally {
        setIsCleaning(false);
    }
  };

  const handleAddFriend = async (suggestionId: string) => {
    if (!currentUser) return;
    const result = await S_sendFriendRequest(currentUser.uid, suggestionId);
    if (result.success) {
      toast({ title: t.requestSent });
      setSentRequests(prev => new Set(prev).add(suggestionId));
    } else {
      toast({ title: "Error", description: result.message || t.errorSendingRequest, variant: "destructive" });
    }
  }

  const renderCardContent = (
    value: number,
    text: string,
    linkHref: string,
    linkText: string,
    loading: boolean,
    emptyText: string,
    emptyLinkText: string,
    emptyLinkHref: string,
    icon?: React.ElementType
  ) => {
    const Icon = icon;
    return (
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{value === 0 && !loading ? emptyText : text}</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href={value === 0 && !loading ? emptyLinkHref : linkHref}>
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                {value === 0 && !loading ? emptyLinkText : linkText}
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    );
  };

  return (
    <PageShell title={t.dashboardTitle} description={t.dashboardDescription}>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t.myGroups}</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
          {renderCardContent(summary.groups, t.myGroupsDescription, "/groups", t.viewMyGroups, isLoadingSummary, t.noGroups, t.discoverGroups, "/groups", Compass)}
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t.upcomingEvents}</CardTitle><CalendarDays className="h-4 w-4 text-muted-foreground" /></CardHeader>
          {renderCardContent(summary.upcomingEvents, t.attendingEventsDescription, "/events", t.viewAllEvents, isLoadingSummary, t.noAttendingEvents, t.exploreEvents, "/events", Search)}
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t.unreadMessages}</CardTitle><MessageSquare className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent>{isLoadingSummary ? (<div className="flex items-center justify-center h-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>) : (<><div className="text-2xl font-bold">{summary.unreadMessages}</div><p className="text-xs text-muted-foreground">{summary.unreadMessages === 0 ? t.noNewMessages : t.unreadMessagesDescription}</p><Button variant="outline" size="sm" className="mt-4" asChild><Link href="/messages">{t.viewMessages}</Link></Button></>)}</CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <Card className="shadow-md flex flex-col">
            <CardHeader>
                <CardTitle>{t.friendSuggestions}</CardTitle>
                <CardDescription>{t.friendSuggestionsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 flex-1">
                {isLoadingSuggestions ? (
                    <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : friendSuggestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{t.noSuggestions}</p>
                ) : (
                    friendSuggestions.slice(0, 3).map(suggestion => (
                        <div key={suggestion.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-secondary/50">
                            <Link href={`/profile/${suggestion.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={suggestion.avatar} />
                                    <AvatarFallback>{suggestion.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{suggestion.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{suggestion.reason}</p>
                                </div>
                            </Link>
                            <Button size="sm" variant="outline" onClick={() => handleAddFriend(suggestion.id)} disabled={sentRequests.has(suggestion.id)}>
                                {sentRequests.has(suggestion.id) ? t.requestSent : <><UserPlus className="mr-2 h-4 w-4" /> {t.addFriend}</>}
                            </Button>
                        </div>
                    ))
                )}
            </CardContent>
            <CardFooter>
                <Button variant="outline" size="sm" className="w-full" onClick={fetchSuggestions} disabled={isLoadingSuggestions}>
                    {isLoadingSuggestions ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RotateCw className="mr-2 h-4 w-4" />
                    )}
                    {t.refreshSuggestions}
                </Button>
            </CardFooter>
        </Card>
         <Card className="shadow-md">
            <CardHeader>
                <CardTitle>{t.latestForumActivity}</CardTitle>
                <CardDescription>{t.latestForumActivityDesc}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingForumActivity ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                             <div key={i} className="flex items-start gap-4">
                                <div className="h-5 w-5 bg-muted rounded-sm mt-1" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded-md w-3/4" />
                                    <div className="h-3 bg-muted rounded-md w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : latestForumActivity.length === 0 ? (
                     <p className="text-sm text-muted-foreground text-center py-4">{t.noForumActivity}</p>
                ) : (
                    <div className="space-y-4">
                        {latestForumActivity.map(activity => (
                             <div key={activity.threadId} className="flex items-start gap-4">
                                <Brain className="h-5 w-5 text-muted-foreground mt-1" />
                                <div className="flex-1">
                                    <Link href={`/forums/${activity.forumId}/${activity.threadId}`} className="font-semibold hover:underline">
                                        {activity.threadTitle}
                                    </Link>
                                    <p className="text-sm text-muted-foreground">
                                        {t.inForum} <Link href={`/forums/${activity.forumId}`} className="font-medium hover:underline text-primary/80">{activity.forumName}</Link>
                                        &nbsp;&bull;&nbsp;<TimeAgo dateString={activity.postedAt} />
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
        <Card className="shadow-md">
            <CardHeader><CardTitle>{t.quickActions}</CardTitle><CardDescription>{t.quickActionsDescription}</CardDescription></CardHeader>
            <CardContent className="flex flex-wrap gap-4">
                <Button asChild><Link href="/groups/create"><PlusCircle className="mr-2 h-4 w-4" /> {t.createNewGroup}</Link></Button>
                <Button asChild variant="secondary"><Link href="/forums"><MessageSquare className="mr-2 h-4 w-4" /> {t.postInForums}</Link></Button>
                
                {!!currentUser && !authLoading && (
                <>
                    {canScheduleAnyEvent ? (
                    <Button asChild variant="secondary">
                        <Link href="/events/create"><PlusCircle className="mr-2 h-4 w-4" /> {t.scheduleNewEvent}</Link>
                    </Button>
                    ) : !isMemberOfAnyGroup ? (
                    <p className="text-xs text-muted-foreground w-full basis-full -mt-2 flex items-center">
                        <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-amber-600"/>
                        {t.joinToSchedule}
                    </p>
                    ) : (
                    <p className="text-xs text-muted-foreground w-full basis-full -mt-2 flex items-center">
                        <Info className="h-3.5 w-3.5 mr-1.5 text-blue-600"/>
                        {t.adminToSchedule}
                    </p>
                    )}
                </>
                )}
                {isOwner && (
                    <Button variant="secondary" onClick={handleCleanup} disabled={isCleaning}>
                        {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {isCleaning ? t.cleaning : t.cleanup}
                    </Button>
                )}
            </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
