
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, PlusCircle, Hash, FileText, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import type { Forum } from "@/types";
import { S_getAllForums, S_deleteForum } from "@/actions/forum-actions";
import { useAuth } from "@/context/AuthContext";
import { TimeAgo } from "@/components/shared/TimeAgo";
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

const translations = {
  en: {
    pageTitle: "Psycho Forums",
    pageDescription: "This is the spot to drop hot takes, share big ideas, and connect with the community. No filter needed.",
    loading: "Loading forums...",
    threads: "Threads",
    posts: "Posts",
    lastPost: "Last Post",
    noForumsTitle: "No Forums Found",
    noForumsDesc: "There are no forums to display yet. Why not create the first one to start the conversation?",
    createForum: "Create Forum",
    noPostsYet: "No posts yet",
    viewForum: "View Forum",
    deleteForum: "Delete Forum",
    deleteConfirmTitle: "Are you absolutely sure?",
    deleteConfirmDesc: "This will permanently delete the forum, all of its threads, and all replies. This action cannot be undone.",
    deleting: "Deleting...",
    forumDeleted: "Forum deleted successfully",
    errorDeleting: "Error deleting forum",
  },
  es: {
    pageTitle: "Foros Psico",
    pageDescription: "Este es el lugar para soltar tus opiniones polémicas, compartir grandes ideas y conectar con la comunidad. Sin filtros.",
    loading: "Cargando foros...",
    threads: "Hilos",
    posts: "Publicaciones",
    lastPost: "Última Publicación",
    noForumsTitle: "No se Encontraron Foros",
    noForumsDesc: "Aún no hay foros para mostrar. ¿Por qué no creas el primero para iniciar la conversación?",
    createForum: "Crear Foro",
    noPostsYet: "Aún no hay publicaciones",
    viewForum: "Ver Foro",
    deleteForum: "Borrar Foro",
    deleteConfirmTitle: "¿Estás absolutamente seguro?",
    deleteConfirmDesc: "Esto eliminará permanentemente el foro, todos sus hilos y todas las respuestas. Esta acción no se puede deshacer.",
    deleting: "Borrando...",
    forumDeleted: "Foro eliminado con éxito",
    errorDeleting: "Error al borrar el foro",
  },
  pt: {
    pageTitle: "Fóruns Psico",
    pageDescription: "Este é o lugar para lançar suas opiniões polêmicas, compartilhar grandes ideias e se conectar com a comunidade. Sem filtros.",
    loading: "Carregando fóruns...",
    threads: "Tópicos",
    posts: "Postagens",
    lastPost: "Última Postagem",
    noForumsTitle: "Nenhum Fórum Encontrado",
    noForumsDesc: "Ainda não há fóruns para exibir. Que tal criar o primeiro para iniciar a conversa?",
    createForum: "Criar Fórum",
    noPostsYet: "Nenhuma postagem ainda",
    viewForum: "Ver Fórum",
    deleteForum: "Excluir Fórum",
    deleteConfirmTitle: "Tem certeza absoluta?",
    deleteConfirmDesc: "Isso excluirá permanentemente o fórum, todos os seus tópicos e todas as respostas. Esta ação não pode ser desfeita.",
    deleting: "Excluindo...",
    forumDeleted: "Fórum excluído com sucesso",
    errorDeleting: "Erro ao excluir fórum",
  },
  fr: {
    pageTitle: "Forums Psycho",
    pageDescription: "C'est l'endroit pour lancer des débats, partager de grandes idées et se connecter avec la communauté. Sans filtre.",
    loading: "Chargement des forums...",
    threads: "Sujets",
    posts: "Messages",
    lastPost: "Dernier Message",
    noForumsTitle: "Aucun Forum Trouvé",
    noForumsDesc: "Il n'y a pas encore de forums à afficher. Pourquoi ne pas créer le premier pour lancer la conversation ?",
    createForum: "Créer un Forum",
    noPostsYet: "Aucun message pour l'instant",
    viewForum: "Voir le Forum",
    deleteForum: "Supprimer le Forum",
    deleteConfirmTitle: "Êtes-vous absolument sûr ?",
    deleteConfirmDesc: "Cela supprimera définitivement le forum, tous ses sujets et toutes les réponses. Cette action est irréversible.",
    deleting: "Suppression...",
    forumDeleted: "Forum supprimé avec succès",
    errorDeleting: "Erreur lors de la suppression du forum",
  },
  de: {
    pageTitle: "Psycho-Foren",
    pageDescription: "Dies ist der Ort, um heiße Meinungen abzugeben, große Ideen zu teilen und sich mit der Community zu vernetzen. Kein Filter nötig.",
    loading: "Lade Foren...",
    threads: "Themen",
    posts: "Beiträge",
    lastPost: "Letzter Beitrag",
    noForumsTitle: "Keine Foren gefunden",
    noForumsDesc: "Es sind noch keine Foren zum Anzeigen vorhanden. Warum nicht das erste erstellen, um die Konversation zu starten?",
    createForum: "Forum erstellen",
    noPostsYet: "Noch keine Beiträge",
    viewForum: "Forum ansehen",
    deleteForum: "Forum löschen",
    deleteConfirmTitle: "Sind Sie absolut sicher?",
    deleteConfirmDesc: "Dadurch werden das Forum, alle Themen und alle Antworten dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.",
    deleting: "Löschen...",
    forumDeleted: "Forum erfolgreich gelöscht",
    errorDeleting: "Fehler beim Löschen des Forums",
  },
  it: {
    pageTitle: "Forum Psico",
    pageDescription: "Questo è il posto giusto per lanciare le tue opinioni scottanti, condividere grandi idee e connetterti con la community. Senza filtri.",
    loading: "Caricamento forum...",
    threads: "Discussioni",
    posts: "Messaggi",
    lastPost: "Ultimo Messaggio",
    noForumsTitle: "Nessun Forum Trovato",
    noForumsDesc: "Non ci sono ancora forum da visualizzare. Perché non crei il primo per avviare la conversazione?",
    createForum: "Crea Forum",
    noPostsYet: "Ancora nessun messaggio",
    viewForum: "Vedi Forum",
    deleteForum: "Elimina Forum",
    deleteConfirmTitle: "Sei assolutamente sicuro?",
    deleteConfirmDesc: "Questo eliminerà permanentemente il forum, tutte le sue discussioni e tutte le risposte. Questa azione non può essere annullata.",
    deleting: "Eliminazione...",
    forumDeleted: "Forum eliminato con successo",
    errorDeleting: "Errore durante l'eliminazione del forum",
  },
  ru: {
    pageTitle: "Психо-форумы",
    pageDescription: "Это место, где можно высказывать смелые мнения, делиться большими идеями и общаться с сообществом. Без фильтров.",
    loading: "Загрузка форумов...",
    threads: "Темы",
    posts: "Сообщения",
    lastPost: "Последнее сообщение",
    noForumsTitle: "Форумы не найдены",
    noForumsDesc: "Пока нет форумов для отображения. Почему бы не создать первый, чтобы начать разговор?",
    createForum: "Создать форум",
    noPostsYet: "Пока нет сообщений",
    viewForum: "Просмотр форума",
    deleteForum: "Удалить форум",
    deleteConfirmTitle: "Вы абсолютно уверены?",
    deleteConfirmDesc: "Это навсегда удалит форум, все его темы и все ответы. Это действие нельзя отменить.",
    deleting: "Удаление...",
    forumDeleted: "Форум успешно удален",
    errorDeleting: "Ошибка при удалении форума",
  }
};

export default function ForumsPage() {
  const [forums, setForums] = useState<Forum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const isOwner = currentUser?.uid === process.env.NEXT_PUBLIC_OWNER_UID;

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split('-')[0] as 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru';
      if (translations[browserLang]) {
        setLang(browserLang);
      }
    }
  }, []);

  const t = translations[lang];

  const loadForums = async () => {
    setIsLoading(true);
    try {
      const fetchedForums = await S_getAllForums();
      const sortedForums = [...fetchedForums].sort((a, b) => {
          const timeA = a.lastPost?.postedAt ? new Date(a.lastPost.postedAt).getTime() : 0;
          const timeB = b.lastPost?.postedAt ? new Date(b.lastPost.postedAt).getTime() : 0;

          if (timeA !== timeB) {
              return timeB - timeA;
          }

          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return createdB - createdA;
      });
      setForums(sortedForums);
    } catch (error) {
      console.error("Failed to fetch forums:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForums();
  }, []);

  const handleDeleteForum = async (forumId: string) => {
      if (!currentUser || !isOwner) return;
      setIsDeleting(forumId);
      const result = await S_deleteForum(forumId, currentUser.uid);
      if (result.success) {
          toast({ title: t.forumDeleted });
          loadForums();
      } else {
          toast({ title: t.errorDeleting, description: result.message, variant: "destructive" });
      }
      setIsDeleting(null);
  };

  const pageActions = (
    <Button asChild>
      <Link href={currentUser ? "/forums/create" : "/login?redirect=/forums/create"}>
        <PlusCircle className="mr-2 h-4 w-4" /> {t.createForum}
      </Link>
    </Button>
  );

  return (
    <PageShell title={t.pageTitle} description={t.pageDescription} actions={pageActions}>
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : forums.length === 0 ? (
        <Card className="text-center py-10">
          <CardHeader>
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle>{t.noForumsTitle}</CardTitle>
            <CardDescription>{t.noForumsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {pageActions}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {forums.map(forum => (
            <Card key={forum.id} className="hover:shadow-md transition-shadow">
              <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-6">
                  <Link href={`/forums/${forum.id}`} className="font-semibold text-lg text-primary hover:underline">{forum.name}</Link>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{forum.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                     <Button variant="outline" size="sm" asChild>
                       <Link href={`/forums/${forum.id}`}>
                         {t.viewForum}
                       </Link>
                    </Button>
                    {isOwner && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isDeleting === forum.id}>
                                    {isDeleting === forum.id ? t.deleting : <><Trash2 className="h-4 w-4 mr-2" /> {t.deleteForum}</>}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                                    <AlertDialogDescription>{t.deleteConfirmDesc}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteForum(forum.id)} className="bg-destructive hover:bg-destructive/90">
                                        {t.deleteForum}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-4 text-sm md:flex-col md:items-center md:gap-0 md:text-center">
                    <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground"/>
                        <div>
                            <p className="font-medium">{forum.threadCount}</p>
                            <p className="text-muted-foreground hidden md:block">{t.threads}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground"/>
                        <div>
                            <p className="font-medium">{forum.postCount}</p>
                            <p className="text-muted-foreground hidden md:block">{t.posts}</p>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-4 text-sm text-muted-foreground md:text-right border-t pt-4 md:border-0 md:pt-0">
                  <p className="font-medium mb-1">{t.lastPost}</p>
                  {forum.lastPost ? (
                    <div className="truncate">
                      <Link href={`/forums/${forum.id}/${forum.lastPost.threadId}`} className="hover:underline text-primary/90 text-foreground font-semibold">
                        {forum.lastPost.threadTitle}
                      </Link>
                      <p className="text-xs"><TimeAgo dateString={forum.lastPost.postedAt} /></p>
                    </div>
                  ) : (
                    <span>{t.noPostsYet}</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
