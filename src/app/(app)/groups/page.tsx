

"use client";

import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusCircle, Users, Eye, Lock, Compass, UserCheck, Send, CheckCircle, Hourglass, Search as SearchIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import type { Group, GroupJoinRequest as ServerGroupJoinRequest } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getAllGroups, S_requestToJoinGroup } from "@/actions/group-actions";
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const USER_AVATAR_STORAGE_KEY_PREFIX = "userAvatar_";
const getDefaultVercelAvatar = (identifier: string | null | undefined) => `https://avatar.vercel.sh/${identifier || 'default'}.png`;

const translations = {
  en: {
    pageTitle: "Groups",
    pageDescription: "Discover public groups or manage the ones you're part of.",
    searchPlaceholder: "Search groups...",
    createGroupButton: "Create Group",
    discoverTab: "Discover Groups",
    myGroupsTab: "My Groups",
    emptyDiscoverTitle: "No Public Groups",
    emptyDiscoverDesc: "There are no public groups available to discover at the moment. Log in to see if you are part of any groups or create a new one!",
    emptyDiscoverLoggedInTitle: "No New Public Groups to Discover",
    emptyDiscoverLoggedInDesc: "You've either joined all available public groups or there are no other public groups. Create one or check back later!",
    emptyDiscoverCta: "Create a Public Group",
    emptyDiscoverCtaLoggedIn: "Create a New Group",
    emptyMyGroupsTitle: "No Groups Joined",
    emptyMyGroupsDesc: "You haven't joined or created any groups yet. Try discovering some public groups or create your own!",
    emptyMyGroupsCta: "Discover Groups",
    emptyLoginTitle: "Login to See Your Groups",
    emptyLoginDesc: "Please log in to view the groups you are a member of.",
    searchNotFoundTitle: "No Groups Found",
    searchNotFoundDesc: (term: string) => `Your search for "${term}" did not match any public groups. Try a different term or create a new group.`,
    myGroupsSearchNotFoundDesc: (term: string) => `Your search for "${term}" did not match any of your groups.`,
    public: "Public",
    private: "Private",
    member: "member",
    members: "members",
    viewGroup: "View Group",
    requestPending: "Request Pending",
    requestToJoin: "Request to Join",
    toastLoginTitle: "Login Required",
    toastLoginDesc: "You must be logged in to request to join a group.",
    toastRequestSentTitle: "Request Sent!",
    toastRequestSentDesc: (name: string) => `Your request to join "${name}" has been sent.`,
    toastErrorTitle: "Error",
    toastErrorDesc: (msg?: string) => msg || "Could not send your join request.",
  },
  es: {
    pageTitle: "Grupos",
    pageDescription: "Descubre grupos públicos o administra aquellos de los que eres parte.",
    searchPlaceholder: "Buscar grupos...",
    createGroupButton: "Crear Grupo",
    discoverTab: "Descubrir Grupos",
    myGroupsTab: "Mis Grupos",
    emptyDiscoverTitle: "No Hay Grupos Públicos",
    emptyDiscoverDesc: "No hay grupos públicos disponibles para descubrir en este momento. ¡Inicia sesión para ver si eres parte de algún grupo o crea uno nuevo!",
    emptyDiscoverLoggedInTitle: "No Hay Nuevos Grupos Públicos por Descubrir",
    emptyDiscoverLoggedInDesc: "Ya te has unido a todos los grupos públicos disponibles o no hay otros grupos públicos. ¡Crea uno o vuelve más tarde!",
    emptyDiscoverCta: "Crear un Grupo Público",
    emptyDiscoverCtaLoggedIn: "Crear un Nuevo Grupo",
    emptyMyGroupsTitle: "No te Has Unido a Ningún Grupo",
    emptyMyGroupsDesc: "Aún no te has unido o creado ningún grupo. ¡Intenta descubrir algunos grupos públicos o crea el tuyo!",
    emptyMyGroupsCta: "Descubrir Grupos",
    emptyLoginTitle: "Inicia Sesión para Ver Tus Grupos",
    emptyLoginDesc: "Por favor, inicia sesión para ver los grupos de los que eres miembro.",
    searchNotFoundTitle: "No se Encontraron Grupos",
    searchNotFoundDesc: (term: string) => `Tu búsqueda de "${term}" no coincidió con ningún grupo público. Intenta con otro término o crea un nuevo grupo.`,
    myGroupsSearchNotFoundDesc: (term: string) => `Tu búsqueda de "${term}" no coincidió con ninguno de tus grupos.`,
    public: "Público",
    private: "Privado",
    member: "miembro",
    members: "miembros",
    viewGroup: "Ver Grupo",
    requestPending: "Solicitud Pendiente",
    requestToJoin: "Solicitar Unirse",
    toastLoginTitle: "Se Requiere Iniciar Sesión",
    toastLoginDesc: "Debes iniciar sesión para solicitar unirte a un grupo.",
    toastRequestSentTitle: "¡Solicitud Enviada!",
    toastRequestSentDesc: (name: string) => `Tu solicitud para unirte a "${name}" ha sido enviada.`,
    toastErrorTitle: "Error",
    toastErrorDesc: (msg?: string) => msg || "No se pudo enviar tu solicitud de unión.",
  },
  pt: {
    pageTitle: "Grupos",
    pageDescription: "Descubra grupos públicos ou gerencie aqueles dos quais você faz parte.",
    searchPlaceholder: "Procurar grupos...",
    createGroupButton: "Criar Grupo",
    discoverTab: "Descobrir Grupos",
    myGroupsTab: "Meus Grupos",
    emptyDiscoverTitle: "Nenhum Grupo Público",
    emptyDiscoverDesc: "Não há grupos públicos disponíveis para descobrir no momento. Faça login para ver se você faz parte de algum grupo ou crie um novo!",
    emptyDiscoverLoggedInTitle: "Nenhum Novo Grupo Público para Descobrir",
    emptyDiscoverLoggedInDesc: "Você já se juntou a todos os grupos públicos disponíveis ou não há outros. Crie um ou volte mais tarde!",
    emptyDiscoverCta: "Criar um Grupo Público",
    emptyDiscoverCtaLoggedIn: "Criar um Novo Grupo",
    emptyMyGroupsTitle: "Você Não Participa de Nenhum Grupo",
    emptyMyGroupsDesc: "Você ainda não se juntou ou criou nenhum grupo. Tente descobrir alguns grupos públicos ou crie o seu próprio!",
    emptyMyGroupsCta: "Descobrir Grupos",
    emptyLoginTitle: "Faça Login para Ver Seus Grupos",
    emptyLoginDesc: "Por favor, faça login para ver os grupos dos quais você é membro.",
    searchNotFoundTitle: "Nenhum Grupo Encontrado",
    searchNotFoundDesc: (term: string) => `Sua busca por "${term}" não correspondeu a nenhum grupo público. Tente um termo diferente ou crie um novo grupo.`,
    myGroupsSearchNotFoundDesc: (term: string) => `Sua busca por "${term}" não correspondeu a nenhum dos seus grupos.`,
    public: "Público",
    private: "Privado",
    member: "membro",
    members: "membros",
    viewGroup: "Ver Grupo",
    requestPending: "Solicitação Pendente",
    requestToJoin: "Solicitar Entrada",
    toastLoginTitle: "Login Necessário",
    toastLoginDesc: "Você precisa estar logado para solicitar a entrada em um grupo.",
    toastRequestSentTitle: "Solicitação Enviada!",
    toastRequestSentDesc: (name: string) => `Sua solicitação para se juntar a "${name}" foi enviada.`,
    toastErrorTitle: "Erro",
    toastErrorDesc: (msg?: string) => msg || "Não foi possível enviar sua solicitação de entrada.",
  },
  fr: {
    pageTitle: "Groupes",
    pageDescription: "Découvrez des groupes publics ou gérez ceux dont vous faites partie.",
    searchPlaceholder: "Rechercher des groupes...",
    createGroupButton: "Créer un Groupe",
    discoverTab: "Découvrir des Groupes",
    myGroupsTab: "Mes Groupes",
    emptyDiscoverTitle: "Aucun Groupe Public",
    emptyDiscoverDesc: "Il n'y a aucun groupe public à découvrir pour le moment. Connectez-vous pour voir si vous faites partie de groupes ou créez-en un nouveau !",
    emptyDiscoverLoggedInTitle: "Aucun Nouveau Groupe Public à Découvrir",
    emptyDiscoverLoggedInDesc: "Vous avez déjà rejoint tous les groupes publics disponibles ou il n'y en a pas d'autres. Créez-en un ou revenez plus tard !",
    emptyDiscoverCta: "Créer un Groupe Public",
    emptyDiscoverCtaLoggedIn: "Créer un Nouveau Groupe",
    emptyMyGroupsTitle: "Vous n'avez rejoint aucun Groupe",
    emptyMyGroupsDesc: "Vous n'avez encore rejoint ou créé aucun groupe. Essayez de découvrir des groupes publics ou de créer le vôtre !",
    emptyMyGroupsCta: "Découvrir des Groupes",
    emptyLoginTitle: "Connectez-vous pour Voir Vos Groupes",
    emptyLoginDesc: "Veuillez vous connecter pour voir les groupes dont vous êtes membre.",
    searchNotFoundTitle: "Aucun Groupe Trouvé",
    searchNotFoundDesc: (term: string) => `Votre recherche pour "${term}" n'a correspondu à aucun groupe public. Essayez un autre terme ou créez un nouveau groupe.`,
    myGroupsSearchNotFoundDesc: (term: string) => `Votre recherche pour "${term}" n'a correspondu à aucun de vos groupes.`,
    public: "Public",
    private: "Privé",
    member: "membre",
    members: "membres",
    viewGroup: "Voir le Groupe",
    requestPending: "Demande en Attente",
    requestToJoin: "Demander à Rejoindre",
    toastLoginTitle: "Connexion Requise",
    toastLoginDesc: "Vous devez être connecté pour demander à rejoindre un groupe.",
    toastRequestSentTitle: "Demande Envoyée !",
    toastRequestSentDesc: (name: string) => `Votre demande pour rejoindre "${name}" a été envoyée.`,
    toastErrorTitle: "Erreur",
    toastErrorDesc: (msg?: string) => msg || "Impossible d'envoyer votre demande d'adhésion.",
  },
  de: {
    pageTitle: "Gruppen",
    pageDescription: "Entdecken Sie öffentliche Gruppen oder verwalten Sie diejenigen, denen Sie angehören.",
    searchPlaceholder: "Gruppen suchen...",
    createGroupButton: "Gruppe erstellen",
    discoverTab: "Gruppen entdecken",
    myGroupsTab: "Meine Gruppen",
    emptyDiscoverTitle: "Keine öffentlichen Gruppen",
    emptyDiscoverDesc: "Im Moment gibt es keine öffentlichen Gruppen zu entdecken. Melden Sie sich an, um zu sehen, ob Sie Teil einer Gruppe sind, oder erstellen Sie eine neue!",
    emptyDiscoverLoggedInTitle: "Keine neuen öffentlichen Gruppen zu entdecken",
    emptyDiscoverLoggedInDesc: "Sie sind entweder allen verfügbaren öffentlichen Gruppen beigetreten oder es gibt keine anderen öffentlichen Gruppen. Erstellen Sie eine oder schauen Sie später wieder vorbei!",
    emptyDiscoverCta: "Eine öffentliche Gruppe erstellen",
    emptyDiscoverCtaLoggedIn: "Eine neue Gruppe erstellen",
    emptyMyGroupsTitle: "Keinen Gruppen beigetreten",
    emptyMyGroupsDesc: "Sie sind noch keinen Gruppen beigetreten oder haben noch keine erstellt. Versuchen Sie, einige öffentliche Gruppen zu entdecken oder Ihre eigene zu erstellen!",
    emptyLoginTitle: "Anmelden, um Ihre Gruppen zu sehen",
    emptyLoginDesc: "Bitte melden Sie sich an, um die Gruppen anzuzeigen, in denen Sie Mitglied sind.",
    searchNotFoundTitle: "Keine Gruppen gefunden",
    searchNotFoundDesc: (term: string) => `Ihre Suche nach "${term}" ergab keine Treffer bei öffentlichen Gruppen. Versuchen Sie einen anderen Begriff oder erstellen Sie eine neue Gruppe.`,
    myGroupsSearchNotFoundDesc: (term: string) => `Ihre Suche nach "${term}" ergab keinen Treffer in Ihren Gruppen.`,
    public: "Öffentlich",
    private: "Privat",
    member: "Mitglied",
    members: "Mitglieder",
    viewGroup: "Gruppe ansehen",
    requestPending: "Anfrage ausstehend",
    requestToJoin: "Beitrittsanfrage",
    toastLoginTitle: "Anmeldung erforderlich",
    toastLoginDesc: "Sie müssen angemeldet sein, um eine Beitrittsanfrage für eine Gruppe zu stellen.",
    toastRequestSentTitle: "Anfrage gesendet!",
    toastRequestSentDesc: (name: string) => `Ihre Anfrage zum Beitritt zu "${name}" wurde gesendet.`,
    toastErrorTitle: "Fehler",
    toastErrorDesc: (msg?: string) => msg || "Ihre Beitrittsanfrage konnte nicht gesendet werden.",
  },
  it: {
    pageTitle: "Gruppi",
    pageDescription: "Scopri gruppi pubblici o gestisci quelli di cui fai parte.",
    searchPlaceholder: "Cerca gruppi...",
    createGroupButton: "Crea Gruppo",
    discoverTab: "Scopri Gruppi",
    myGroupsTab: "I Miei Gruppi",
    emptyDiscoverTitle: "Nessun Gruppo Pubblico",
    emptyDiscoverDesc: "Al momento non ci sono gruppi pubblici da scoprire. Accedi per vedere se fai parte di qualche gruppo o creane uno nuovo!",
    emptyDiscoverLoggedInTitle: "Nessun Nuovo Gruppo Pubblico da Scoprire",
    emptyDiscoverLoggedInDesc: "Ti sei già unito a tutti i gruppi pubblici disponibili o non ce ne sono altri. Creane uno o torna più tardi!",
    emptyDiscoverCta: "Crea un Gruppo Pubblico",
    emptyDiscoverCtaLoggedIn: "Crea un Nuovo Gruppo",
    emptyMyGroupsTitle: "Nessun Gruppo a Cui Sei Iscritto",
    emptyMyGroupsDesc: "Non ti sei ancora unito o non hai ancora creato nessun gruppo. Prova a scoprire qualche gruppo pubblico o creane uno tuo!",
    emptyMyGroupsCta: "Scopri Gruppi",
    emptyLoginTitle: "Accedi per Vedere i Tuoi Gruppi",
    emptyLoginDesc: "Effettua il login per visualizzare i gruppi di cui sei membro.",
    searchNotFoundTitle: "Nessun Gruppo Trovato",
    searchNotFoundDesc: (term: string) => `La tua ricerca per "${term}" non ha trovato gruppi pubblici. Prova con un altro termine o crea un nuovo gruppo.`,
    myGroupsSearchNotFoundDesc: (term: string) => `La tua ricerca per "${term}" non ha trovato nessuno dei tuoi gruppi.`,
    public: "Pubblico",
    private: "Privato",
    member: "membro",
    members: "membri",
    viewGroup: "Vedi Gruppo",
    requestPending: "Richiesta in Attesa",
    requestToJoin: "Richiedi di Unirti",
    toastLoginTitle: "Login Richiesto",
    toastLoginDesc: "Devi essere loggato per richiedere di unirti a un gruppo.",
    toastRequestSentTitle: "Richiesta Inviata!",
    toastRequestSentDesc: (name: string) => `La tua richiesta di unirti a "${name}" è stata inviata.`,
    toastErrorTitle: "Errore",
    toastErrorDesc: (msg?: string) => msg || "Impossibile inviare la richiesta di adesione."
  },
  ru: {
    pageTitle: "Группы",
    pageDescription: "Находите публичные группы или управляйте теми, в которых вы состоите.",
    searchPlaceholder: "Поиск групп...",
    createGroupButton: "Создать группу",
    discoverTab: "Найти группы",
    myGroupsTab: "Мои группы",
    emptyDiscoverTitle: "Нет публичных групп",
    emptyDiscoverDesc: "На данный момент нет доступных для обнаружения публичных групп. Войдите, чтобы увидеть, состоите ли вы в каких-либо группах, или создайте новую!",
    emptyDiscoverLoggedInTitle: "Нет новых публичных групп для обнаружения",
    emptyDiscoverLoggedInDesc: "Вы либо присоединились ко всем доступным публичным группам, либо других публичных групп нет. Создайте одну или зайдите позже!",
    emptyDiscoverCta: "Создать публичную группу",
    emptyDiscoverCtaLoggedIn: "Создать новую группу",
    emptyMyGroupsTitle: "Вы не состоите в группах",
    emptyMyGroupsDesc: "Вы еще не присоединились ни к одной группе и не создали свою. Попробуйте найти публичные группы или создайте свою!",
    emptyMyGroupsCta: "Найти группы",
    emptyLoginTitle: "Войдите, чтобы увидеть свои группы",
    emptyLoginDesc: "Пожалуйста, войдите, чтобы просмотреть группы, в которых вы состоите.",
    searchNotFoundTitle: "Группы не найдены",
    searchNotFoundDesc: (term: string) => `Ваш поиск по запросу "${term}" не дал результатов среди публичных групп. Попробуйте другой запрос или создайте новую группу.`,
    myGroupsSearchNotFoundDesc: (term: string) => `Ваш поиск по запросу "${term}" не дал результатов среди ваших групп.`,
    public: "Публичная",
    private: "Частная",
    member: "участник",
    members: "участников",
    viewGroup: "Просмотр группы",
    requestPending: "Заявка в ожидании",
    requestToJoin: "Подать заявку",
    toastLoginTitle: "Требуется вход",
    toastLoginDesc: "Вы должны войти в систему, чтобы подать заявку на вступление в группу.",
    toastRequestSentTitle: "Заявка отправлена!",
    toastRequestSentDesc: (name: string) => `Ваша заявка на вступление в "${name}" отправлена.`,
    toastErrorTitle: "Ошибка",
    toastErrorDesc: (msg?: string) => msg || "Не удалось отправить вашу заявку на вступление.",
  }
};


export default function GroupsPage() {
  const [allLoadedGroups, setAllLoadedGroups] = useState<Group[]>([]);
  const [currentUserPendingRequests, setCurrentUserPendingRequests] = useState<ServerGroupJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("discover");
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split('-')[0] as 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru';
      if (translations[browserLang]) {
        setLang(browserLang);
      }
    }
  }, []);

  const t = translations[lang] || translations['en'];

  useEffect(() => {
    document.title = `${t.pageTitle} | GroupHub`;
  }, [t]);

  const fetchPageData = useCallback(async () => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    setIsLoading(true);
    try {
      const loadedGroups = await getAllGroups();
      setAllLoadedGroups(loadedGroups);

    } catch (error) {
      console.error("[GroupsPage] Error fetching groups via server action:", error);
      setAllLoadedGroups([]);
    }
    setIsLoading(false);
  }, [authLoading]);

  useEffect(() => {
    fetchPageData();

    const handleStorageChange = () => {
        fetchPageData();
    };
    window.addEventListener('storageUpdated', handleStorageChange);

    return () => {
        window.removeEventListener('storageUpdated', handleStorageChange);
    };
  }, [fetchPageData]);


  useEffect(() => {
    if (!isLoading && !authLoading) {
      if (currentUser && allLoadedGroups.length > 0) {
        const isMemberOfAny = allLoadedGroups.some(group => Array.isArray(group.memberIds) && group.memberIds.includes(currentUser.uid));
        const newInitialTab = isMemberOfAny ? "my-groups" : "discover";
        setActiveTab(newInitialTab);
      } else if (!currentUser) {
        setActiveTab("discover");
      }
    }
  }, [currentUser, allLoadedGroups, isLoading, authLoading]);


  const filteredGroupsByName = useMemo(() => {
    if (!searchTerm.trim()) {
      return allLoadedGroups;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = allLoadedGroups.filter(group =>
      (group.name || '').toLowerCase().includes(lowerSearchTerm) ||
      (group.description || '').toLowerCase().includes(lowerSearchTerm)
    );
    return filtered;
  }, [allLoadedGroups, searchTerm]);

  const myGroups = useMemo(() => {
    if (!currentUser || isLoading) return [];
    const memberOf = filteredGroupsByName.filter(group =>
      Array.isArray(group.memberIds) && group.memberIds.includes(currentUser.uid)
    );
    return memberOf;
  }, [currentUser, filteredGroupsByName, isLoading]);

  const discoverableGroups = useMemo(() => {
    if (isLoading) return [];
    const discoverable = filteredGroupsByName.filter(group => {
      const isMember = currentUser ? (Array.isArray(group.memberIds) && group.memberIds.includes(currentUser.uid)) : false;
      return group.isPublic && !isMember;
    });
    return discoverable;
  }, [currentUser, filteredGroupsByName, isLoading]);


  const handleRequestToJoin = async (groupId: string) => {
    if (!currentUser) {
      toast({ title: t.toastLoginTitle, description: t.toastLoginDesc, variant: "destructive" });
      return;
    }
    const groupToJoin = allLoadedGroups.find(g => g.id === groupId);
    if (!groupToJoin) return;

    const userStoredAvatar = localStorage.getItem(`${USER_AVATAR_STORAGE_KEY_PREFIX}${currentUser.uid}`);
    const senderAvatarResolved = userStoredAvatar || currentUser.photoURL || getDefaultVercelAvatar(currentUser.email || currentUser.uid);

    const result = await S_requestToJoinGroup(
        groupId,
        currentUser.uid,
        currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        senderAvatarResolved
    );

    if (result.success && result.request) {
      setCurrentUserPendingRequests(prev => [...prev, result.request!]);
      toast({
        title: t.toastRequestSentTitle,
        description: t.toastRequestSentDesc(groupToJoin.name),
        action: <CheckCircle className="h-5 w-5 text-green-500" />,
      });
      dispatchStorageUpdatedEvent();
    } else {
      toast({ title: t.toastErrorTitle, description: t.toastErrorDesc(result.message), variant: "destructive" });
    }
  };

  const renderGroupCard = (group: Group, isDiscoverContext: boolean) => {
    const isUserMember = currentUser ? (Array.isArray(group.memberIds) && group.memberIds.includes(currentUser.uid)) : false;
    const existingRequest = isDiscoverContext && !group.isPublic && currentUser ?
      currentUserPendingRequests.find(req => req.groupId === group.id && req.userId === currentUser.uid && req.status === 'pending') : null;

    return (
    <Card key={group.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-6 pb-2 flex-row gap-4 items-start">
        <Avatar className="h-12 w-12 border">
            <AvatarImage src={group.image} alt={group.name} />
            <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
            <CardTitle className="font-headline text-xl mb-1">{group.name}</CardTitle>
            <div className="flex items-center text-xs text-muted-foreground">
              {group.isPublic ? <Eye className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
              <span>{group.isPublic ? t.public : t.private}</span>
              <span className="mx-1.5">&bull;</span>
              <span>{group.memberIds?.length || 0} {(group.memberIds?.length || 0) === 1 ? t.member : t.members}</span>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2 flex-grow">
        <CardDescription className="text-sm line-clamp-3">{group.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-6 pt-0">
          {isDiscoverContext && !group.isPublic && currentUser && !isUserMember ? (
            existingRequest ? (
              <Button className="w-full" variant="outline" disabled>
                <Hourglass className="mr-2 h-4 w-4" /> {t.requestPending}
              </Button>
            ) : (
              <Button className="w-full" onClick={() => handleRequestToJoin(group.id)}>
                <Send className="mr-2 h-4 w-4" /> {t.requestToJoin}
              </Button>
            )
          ) : (
            <Button asChild className="w-full">
              <Link href={`/groups/${group.id}`}>{t.viewGroup}</Link>
            </Button>
          )}
        </CardFooter>
    </Card>
    );
  };

  const renderEmptyState = (icon: React.ElementType, title: string, description: string, ctaText?: string, ctaLink?: string, isDiscoverTab?: boolean) => {
    const IconComponent = icon;
    let actualCtaText = ctaText;
    let actualCtaHref = ctaLink;

    if (isDiscoverTab && ctaLink === "#") {
      actualCtaText = t.createGroupButton;
      actualCtaHref = "/groups/create";
    }

    return (
      <Card className="text-center py-10 col-span-full">
        <CardHeader>
          <IconComponent className="mx-auto h-12 w-12 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {actualCtaText && actualCtaHref && (
          <CardContent>
            <Button asChild>
              <Link href={actualCtaHref}>
                <PlusCircle className="mr-2 h-4 w-4" /> {actualCtaText}
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
    );
  };

  const pageActions = (
    <>
      <div className="relative w-full max-w-xs">
        <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t.searchPlaceholder}
          className="pl-8 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isLoading || authLoading}
        />
      </div>
      <Button asChild>
        <Link href="/groups/create">
          <PlusCircle className="mr-2 h-4 w-4" /> {t.createGroupButton}
        </Link>
      </Button>
    </>
  );

  if (isLoading || authLoading) {
    return (
      <PageShell
        title={t.pageTitle}
        description="Loading groups..."
        actions={pageActions}
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={`skeleton-${i}`} className="flex flex-col shadow-lg">
              <CardHeader className="p-6 pb-2">
                <Skeleton className="h-6 w-3/4 mb-2 rounded" />
                <Skeleton className="h-4 w-1/2 mb-2 rounded" />
              </CardHeader>
              <CardContent className="p-6 pt-2 flex-grow">
                <Skeleton className="h-10 w-full mb-4 rounded" />
              </CardContent>
              <CardFooter className="p-6 pt-0">
                <Skeleton className="h-10 w-full rounded" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </PageShell>
    );
  }


  return (
    <PageShell
      title={t.pageTitle}
      description={t.pageDescription}
      actions={pageActions}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="discover"><Compass className="mr-2 h-4 w-4" /> {t.discoverTab}</TabsTrigger>
          <TabsTrigger value="my-groups" disabled={!currentUser}><UserCheck className="mr-2 h-4 w-4" /> {t.myGroupsTab}</TabsTrigger>
        </TabsList>
        <TabsContent value="discover">
          {discoverableGroups.length === 0 ? (
            searchTerm ?
                renderEmptyState(SearchIcon, t.searchNotFoundTitle, t.searchNotFoundDesc(searchTerm), t.createGroupButton, "/groups/create")
            : currentUser ?
                renderEmptyState(Compass, t.emptyDiscoverLoggedInTitle, t.emptyDiscoverLoggedInDesc, t.emptyDiscoverCtaLoggedIn, "/groups/create")
                :
                renderEmptyState(Compass, t.emptyDiscoverTitle, t.emptyDiscoverDesc, t.emptyDiscoverCta, "/groups/create")

          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {discoverableGroups.map(group => renderGroupCard(group, true))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="my-groups">
          {!currentUser ? (
            renderEmptyState(Lock, t.emptyLoginTitle, t.emptyLoginDesc)
          ) : myGroups.length === 0 ? (
             searchTerm ?
                renderEmptyState(SearchIcon, t.searchNotFoundTitle, t.myGroupsSearchNotFoundDesc(searchTerm), t.discoverTab, "#", true)
             :
                renderEmptyState(Users, t.emptyMyGroupsTitle, t.emptyMyGroupsDesc, t.emptyMyGroupsCta, "#", true)
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myGroups.map(group => renderGroupCard(group, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
