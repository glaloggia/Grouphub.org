
"use client";

import { PageShell } from "@/components/shared/PageShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import React, { useState, type FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Users, Info, Eye, Lock, UploadCloud } from "lucide-react";
import { createGroup } from '@/actions/group-actions'; 
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";
import Image from "next/image";

const MAX_IMAGE_SIZE_MB = 2;

const translations = {
  en: {
    pageTitle: "Create New Group",
    pageDescription: "Fill in the details below to start a new group.",
    loadingTitle: "Create New Group",
    loadingDescription: "Loading form...",
    loadingCard: "Loading Group Form...",
    groupDetails: "Group Details",
    groupDetailsDesc: "Provide information about the group you want to create.",
    groupNameLabel: "Group Name",
    groupNamePlaceholder: "e.g., Awesome Project Team",
    description: "Description",
    descriptionPlaceholder: "What is this group about?",
    imageLabel: "Group Image (Optional)",
    imageSizeNote: (size: number) => `Max file size: ${size}MB.`,
    cancel: "Cancel",
    creating: "Creating Group...",
    create: "Create Group",
    publicGroupDesc: "Public Group (Visible to everyone)",
    privateGroupDesc: "Private Group (Members only)",
    toast_loginRequired_title: "Login Required",
    toast_loginRequired_desc: "Please log in to create a group.",
    error_nameRequired: "Group name is required.",
    toast_groupCreated_title: "Group Created!",
    toast_groupCreated_desc: (groupName: string) => `Group "${groupName}" has been created successfully.`,
    toast_error_title: "Error",
    toast_error_desc_server: "Failed to create group on the server.",
    toast_error_desc_unexpected: "An unexpected error occurred. Please try again.",
    toast_error_desc_save: "Failed to save group.",
  },
  es: {
    pageTitle: "Crear Nuevo Grupo",
    pageDescription: "Rellena los detalles a continuación para crear un nuevo grupo.",
    loadingTitle: "Crear Nuevo Grupo",
    loadingDescription: "Cargando formulario...",
    loadingCard: "Cargando Formulario de Grupo...",
    groupDetails: "Detalles del Grupo",
    groupDetailsDesc: "Proporciona información sobre el grupo que quieres crear.",
    groupNameLabel: "Nombre del Grupo",
    groupNamePlaceholder: "p.ej., Equipo de Proyecto Increíble",
    description: "Descripción",
    descriptionPlaceholder: "¿De qué trata este grupo?",
    imageLabel: "Imagen del Grupo (Opcional)",
    imageSizeNote: (size: number) => `Tamaño máximo de archivo: ${size}MB.`,
    cancel: "Cancelar",
    creating: "Creando Grupo...",
    create: "Crear Grupo",
    publicGroupDesc: "Grupo Público (Visible para todos)",
    privateGroupDesc: "Grupo Privado (Solo para miembros)",
    toast_loginRequired_title: "Se Requiere Iniciar Sesión",
    toast_loginRequired_desc: "Por favor, inicia sesión para crear un grupo.",
    error_nameRequired: "El nombre del grupo es obligatorio.",
    toast_groupCreated_title: "¡Grupo Creado!",
    toast_groupCreated_desc: (groupName: string) => `El grupo "${groupName}" ha sido creado correctamente.`,
    toast_error_title: "Error",
    toast_error_desc_server: "Falló al crear el grupo en el servidor.",
    toast_error_desc_unexpected: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.",
    toast_error_desc_save: "Falló al guardar el grupo.",
  },
  pt: {
    pageTitle: "Criar Novo Grupo",
    pageDescription: "Preencha os detalhes abaixo para iniciar um novo grupo.",
    loadingTitle: "Criar Novo Grupo",
    loadingDescription: "Carregando formulário...",
    loadingCard: "Carregando Formulário de Grupo...",
    groupDetails: "Detalhes do Grupo",
    groupDetailsDesc: "Forneça informações sobre o grupo que você deseja criar.",
    groupNameLabel: "Nome do Grupo",
    groupNamePlaceholder: "ex., Equipe de Projeto Incrível",
    description: "Descrição",
    descriptionPlaceholder: "Sobre o que é este grupo?",
    imageLabel: "Imagem do Grupo (Opcional)",
    imageSizeNote: (size: number) => `Tamanho máximo do arquivo: ${size}MB.`,
    cancel: "Cancelar",
    creating: "Criando Grupo...",
    create: "Criar Grupo",
    publicGroupDesc: "Grupo Público (Visível para todos)",
    privateGroupDesc: "Grupo Privado (Apenas para membros)",
    toast_loginRequired_title: "Login Necessário",
    toast_loginRequired_desc: "Por favor, faça login para criar um grupo.",
    error_nameRequired: "O nome do grupo é obrigatório.",
    toast_groupCreated_title: "Grupo Criado!",
    toast_groupCreated_desc: (groupName: string) => `O grupo "${groupName}" foi criado com sucesso.`,
    toast_error_title: "Erro",
    toast_error_desc_server: "Falha ao criar o grupo no servidor.",
    toast_error_desc_unexpected: "Ocorreu um erro inesperado. Por favor, tente novamente.",
    toast_error_desc_save: "Falha ao salvar o grupo.",
  },
  fr: {
    pageTitle: "Créer un Nouveau Groupe",
    pageDescription: "Remplissez les détails ci-dessous pour créer un nouveau groupe.",
    loadingTitle: "Créer un Nouveau Groupe",
    loadingDescription: "Chargement du formulaire...",
    loadingCard: "Chargement du Formulaire de Groupe...",
    groupDetails: "Détails du Groupe",
    groupDetailsDesc: "Fournissez des informations sur le groupe que vous souhaitez créer.",
    groupNameLabel: "Nom du Groupe",
    groupNamePlaceholder: "ex., Équipe de Projet Incroyable",
    description: "Description",
    descriptionPlaceholder: "De quoi s'agit-il dans ce groupe ?",
    imageLabel: "Image du Groupe (Optionnel)",
    imageSizeNote: (size: number) => `Taille maximale du fichier : ${size}Mo.`,
    cancel: "Annuler",
    creating: "Création du Groupe...",
    create: "Créer un Groupe",
    publicGroupDesc: "Groupe Public (Visible par tous)",
    privateGroupDesc: "Groupe Privé (Membres seulement)",
    toast_loginRequired_title: "Connexion Requise",
    toast_loginRequired_desc: "Veuillez vous connecter pour créer un groupe.",
    error_nameRequired: "Le nom du groupe est requis.",
    toast_groupCreated_title: "Groupe Créé !",
    toast_groupCreated_desc: (groupName: string) => `Le groupe "${groupName}" a été créé avec succès.`,
    toast_error_title: "Erreur",
    toast_error_desc_server: "Échec de la création du groupe sur le serveur.",
    toast_error_desc_unexpected: "Une erreur inattendue s'est produite. Veuillez réessayer.",
    toast_error_desc_save: "Échec de la sauvegarde du groupe.",
  },
  de: {
    pageTitle: "Neue Gruppe erstellen",
    pageDescription: "Füllen Sie die folgenden Details aus, um eine neue Gruppe zu starten.",
    loadingTitle: "Neue Gruppe erstellen",
    loadingDescription: "Formular wird geladen...",
    loadingCard: "Lade Gruppenformular...",
    groupDetails: "Gruppendetails",
    groupDetailsDesc: "Geben Sie Informationen über die Gruppe an, die Sie erstellen möchten.",
    groupNameLabel: "Gruppenname",
    groupNamePlaceholder: "z.B. Super Projektteam",
    description: "Beschreibung",
    descriptionPlaceholder: "Worum geht es in dieser Gruppe?",
    imageLabel: "Gruppenbild (optional)",
    imageSizeNote: (size: number) => `Maximale Dateigröße: ${size}MB.`,
    cancel: "Abbrechen",
    creating: "Gruppe wird erstellt...",
    create: "Gruppe erstellen",
    publicGroupDesc: "Öffentliche Gruppe (für alle sichtbar)",
    privateGroupDesc: "Private Gruppe (nur für Mitglieder)",
    toast_loginRequired_title: "Anmeldung erforderlich",
    toast_loginRequired_desc: "Bitte melden Sie sich an, um eine Gruppe zu erstellen.",
    error_nameRequired: "Gruppenname ist erforderlich.",
    toast_groupCreated_title: "Gruppe erstellt!",
    toast_groupCreated_desc: (groupName: string) => `Die Gruppe "${groupName}" wurde erfolgreich erstellt.`,
    toast_error_title: "Fehler",
    toast_error_desc_server: "Gruppe konnte auf dem Server nicht erstellt werden.",
    toast_error_desc_unexpected: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    toast_error_desc_save: "Gruppe konnte nicht gespeichert werden.",
  },
  it: {
    pageTitle: "Crea Nuovo Gruppo",
    pageDescription: "Compila i dettagli qui sotto per avviare un nuovo gruppo.",
    loadingTitle: "Crea Nuovo Gruppo",
    loadingDescription: "Caricamento modulo...",
    loadingCard: "Caricamento Modulo Gruppo...",
    groupDetails: "Dettagli Gruppo",
    groupDetailsDesc: "Fornisci informazioni sul gruppo che vuoi creare.",
    groupNameLabel: "Nome Gruppo",
    groupNamePlaceholder: "es., Fantastico Team di Progetto",
    description: "Descrizione",
    descriptionPlaceholder: "Di cosa tratta questo gruppo?",
    imageLabel: "Immagine Gruppo (Opzionale)",
    imageSizeNote: (size: number) => `Dimensione massima file: ${size}MB.`,
    cancel: "Annulla",
    creating: "Creazione Gruppo...",
    create: "Crea Gruppo",
    publicGroupDesc: "Gruppo Pubblico (Visibile a tutti)",
    privateGroupDesc: "Gruppo Privato (Solo per membri)",
    toast_loginRequired_title: "Login Richiesto",
    toast_loginRequired_desc: "Effettua il login per creare un gruppo.",
    error_nameRequired: "Il nome del gruppo è obbligatorio.",
    toast_groupCreated_title: "Gruppo Creato!",
    toast_groupCreated_desc: (groupName: string) => `Il gruppo "${groupName}" è stato creato con successo.`,
    toast_error_title: "Errore",
    toast_error_desc_server: "Impossibile creare il gruppo sul server.",
    toast_error_desc_unexpected: "Si è verificato un errore imprevisto. Riprova.",
    toast_error_desc_save: "Impossibile salvare il gruppo."
  },
  ru: {
    pageTitle: "Создать новую группу",
    pageDescription: "Заполните детали ниже, чтобы создать новую группу.",
    loadingTitle: "Создать новую группу",
    loadingDescription: "Загрузка формы...",
    loadingCard: "Загрузка формы группы...",
    groupDetails: "Детали группы",
    groupDetailsDesc: "Предоставьте информацию о группе, которую вы хотите создать.",
    groupNameLabel: "Название группы",
    groupNamePlaceholder: "например, Команда крутого проекта",
    description: "Описание",
    descriptionPlaceholder: "О чем эта группа?",
    imageLabel: "Изображение группы (необязательно)",
    imageSizeNote: (size: number) => `Максимальный размер файла: ${size}МБ.`,
    cancel: "Отмена",
    creating: "Создание группы...",
    create: "Создать группу",
    publicGroupDesc: "Публичная группа (видна всем)",
    privateGroupDesc: "Частная группа (только для участников)",
    toast_loginRequired_title: "Требуется вход",
    toast_loginRequired_desc: "Пожалуйста, войдите, чтобы создать группу.",
    error_nameRequired: "Название группы обязательно.",
    toast_groupCreated_title: "Группа создана!",
    toast_groupCreated_desc: (groupName: string) => `Группа "${groupName}" была успешно создана.`,
    toast_error_title: "Ошибка",
    toast_error_desc_server: "Не удалось создать группу на сервере.",
    toast_error_desc_unexpected: "Произошла непредвиденная ошибка. Пожалуйста, попробуйте еще раз.",
    toast_error_desc_save: "Не удалось сохранить группу.",
  }
};

export default function CreateGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageBase64(null);
      setImagePreview(null);
      setFormError(null);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setFormError(t.imageSizeNote(MAX_IMAGE_SIZE_MB));
      setImageBase64(null);
      setImagePreview(null);
      if (event.target) event.target.value = "";
      return;
    }

    setFormError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImageBase64(dataUrl);
      setImagePreview(dataUrl);
    };
    reader.onerror = () => {
      setFormError("Failed to read the image file.");
      setImageBase64(null);
      setImagePreview(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!currentUser) {
      setFormError("You must be logged in to create a group.");
      toast({ title: t.toast_loginRequired_title, description: t.toast_loginRequired_desc, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    if (!groupName.trim()) {
      setFormError(t.error_nameRequired);
      setIsSubmitting(false);
      return;
    }

    const groupDataToCreate = {
      name: groupName,
      description: groupDescription,
      isPublic: isPublic,
      creatorId: currentUser.uid,
      image: imageBase64 || undefined,
    };

    try {
      const result = await createGroup(groupDataToCreate);

      if (result.success && result.group) {
        dispatchStorageUpdatedEvent();
        
        toast({
          title: t.toast_groupCreated_title,
          description: t.toast_groupCreated_desc(groupName),
        });
        
        setGroupName("");
        setGroupDescription("");
        setIsPublic(true);
        router.push("/groups");

      } else {
        setFormError(result.message || t.toast_error_desc_server);
        toast({ title: t.toast_error_title, description: result.message || t.toast_error_desc_server, variant: "destructive"});
      }
    } catch (error: any) {
        setFormError(t.toast_error_desc_unexpected);
        toast({ title: t.toast_error_title, description: t.toast_error_desc_save, variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      title={t.pageTitle}
      description={t.pageDescription}
    >
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="font-headline">{t.groupDetails}</CardTitle>
            <CardDescription>
              {t.groupDetailsDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="groupName">{t.groupNameLabel}</Label>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="groupName"
                  placeholder={t.groupNamePlaceholder}
                  value={groupName}
                  onChange={(e) => {
                    setGroupName(e.target.value);
                    setFormError(null);
                  }}
                  aria-required="true"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupDescription">{t.description}</Label>
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-muted-foreground mt-2.5 shrink-0" />
                <Textarea
                  id="groupDescription"
                  placeholder={t.descriptionPlaceholder}
                  rows={4}
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupImageFile">{t.imageLabel}</Label>
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="groupImageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
              {imagePreview && (
                 <div className="mt-2 flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">Preview:</p>
                    <Image src={imagePreview} alt="Group image preview" width={64} height={64} className="rounded-full aspect-square object-cover" />
                 </div>
              )}
              <p className="text-xs text-muted-foreground">{t.imageSizeNote(MAX_IMAGE_SIZE_MB)}</p>
            </div>


            <div className="flex items-center space-x-2">
              <Switch
                id="groupVisibility"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="groupVisibility" className="flex items-center">
                {isPublic ? <Eye className="h-4 w-4 mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
                {isPublic ? t.publicGroupDesc : t.privateGroupDesc}
              </Label>
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild type="button">
              <Link href="/groups">{t.cancel}</Link>
            </Button>
            <Button type="submit" disabled={!currentUser || isSubmitting}>
              {isSubmitting ? t.creating : t.create}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </PageShell>
  );
}
