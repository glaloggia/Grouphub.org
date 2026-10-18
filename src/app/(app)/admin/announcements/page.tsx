
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { useAuth } from "@/context/AuthContext";
import { S_broadcastMessageToAllGroups } from "@/actions/admin-actions";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Send, AlertTriangle, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const translations = {
    en: {
        title: "Global Announcements",
        description: "Send a broadcast message to all existing groups at once.",
        messageLabel: "Announcement Message",
        placeholder: "Write your announcement here... (Markdown supported)",
        preview: "Preview",
        write: "Write",
        send: "Broadcast Announcement",
        sending: "Broadcasting...",
        confirmTitle: "Are you sure?",
        confirmDesc: "This message will be posted to EVERY group on the platform. This cannot be undone.",
        success: "Success",
        error: "Error",
        loading: "Loading...",
        permissionDenied: "You do not have permission to access this page.",
        broadcastTip: "Tip: Use Markdown for formatting. For example, **bold** or [links](url).",
    },
    es: {
        title: "Anuncios Globales",
        description: "Envía un mensaje masivo a todos los grupos existentes simultáneamente.",
        messageLabel: "Mensaje del Anuncio",
        placeholder: "Escribe tu anuncio aquí... (Soporta Markdown)",
        preview: "Previsualización",
        write: "Escribir",
        send: "Transmitir Anuncio",
        sending: "Transmitiendo...",
        confirmTitle: "¿Estás seguro?",
        confirmDesc: "Este mensaje será publicado en TODOS los grupos de la plataforma. Esta acción no se puede deshacer.",
        success: "Éxito",
        error: "Error",
        loading: "Cargando...",
        permissionDenied: "No tienes permiso para acceder a esta página.",
        broadcastTip: "Tip: Usa Markdown para formatear. Por ejemplo, **negrita** o [enlaces](url).",
    }
};

export default function AdminAnnouncementsPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lang, setLang] = useState<'en' | 'es'>('en');

    const isOwner = currentUser?.uid === process.env.NEXT_PUBLIC_OWNER_UID;

    useEffect(() => {
        if (typeof window !== "undefined" && navigator.language) {
            const browserLang = navigator.language.split('-')[0];
            if (browserLang === 'es') setLang('es');
        }
    }, []);

    const t = translations[lang] || translations['en'];

    useEffect(() => {
        if (!authLoading && currentUser && !isOwner) {
            router.replace('/dashboard');
        } else if (!authLoading && !currentUser) {
            router.replace('/login');
        }
    }, [authLoading, isOwner, router, currentUser]);

    const handleBroadcast = async () => {
        if (!message.trim() || !currentUser || !isOwner) return;

        setIsSubmitting(true);
        try {
            const result = await S_broadcastMessageToAllGroups(currentUser.uid, message);
            if (result.success) {
                toast({ title: t.success, description: result.message });
                setMessage("");
            } else {
                toast({ title: t.error, description: result.message, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: t.error, description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || !isOwner) {
        return <PageShell title={t.loading}><Skeleton className="h-48 w-full" /></PageShell>;
    }

    return (
        <PageShell title={t.title} description={t.description}>
            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="shadow-lg border-primary/20">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Megaphone className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle>{t.title}</CardTitle>
                                <CardDescription>{t.broadcastTip}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="write" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="write">{t.write}</TabsTrigger>
                                <TabsTrigger value="preview" disabled={!message.trim()}>{t.preview}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="write" className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="broadcast-message">{t.messageLabel}</Label>
                                    <Textarea
                                        id="broadcast-message"
                                        placeholder={t.placeholder}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows={12}
                                        className="font-mono text-sm resize-none"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </TabsContent>
                            <TabsContent value="preview">
                                <div className="border rounded-md p-4 min-h-[300px] bg-muted/30 prose dark:prose-invert max-w-none">
                                    <ReactMarkdown>{message}</ReactMarkdown>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 bg-muted/30 p-6 rounded-b-lg">
                        <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md w-full">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>{t.confirmDesc}</p>
                        </div>
                        <Button 
                            onClick={handleBroadcast} 
                            disabled={isSubmitting || !message.trim()} 
                            className="w-full sm:w-auto"
                            size="lg"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.sending}</>
                            ) : (
                                <><Send className="mr-2 h-4 w-4" /> {t.send}</>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-blue-500" />
                            <CardTitle className="text-lg">Información sobre Broadcasts</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>• Los mensajes aparecerán en el tablón de mensajes de cada grupo.</p>
                        <p>• El remitente aparecerá como tu nombre seguido de "(Announcement)".</p>
                        <p>• Esta acción disparará una notificación de "Mensajes nuevos" para todos los miembros de todos los grupos.</p>
                        <p>• No hay límite de grupos, el proceso se maneja en lotes automáticos.</p>
                    </CardContent>
                </Card>
            </div>
        </PageShell>
    );
}
