
"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useState, type FormEvent, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { PageShell } from "@/components/shared/PageShell";
import { Avatar, AvatarFallback, AvatarImage as NextAvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, AlertTriangle, Users, Eye, Lock, UserPlus, UserCheck, UserX, Send, CheckCircle, XCircle, MailWarning, Hourglass, ArrowLeft, Camera, Trash2, UploadCloud, Tag, MoreHorizontal, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Group as StoredGroup, FriendRequest, ContactableUser } from "@/types";
import Link from "next/link";
import NextImage from "next/image";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";
import { getUserProfile, updateUserProfile, S_getUserFromAllUsersList } from "@/actions/user-profile-actions";
import {
    S_sendFriendRequest,
    S_getPendingFriendRequests,
    S_respondToFriendRequest,
    S_cancelSentFriendRequestByRecipient,
    S_getUserFriends,
    S_unfriend,
    S_getFriendshipStatus
} from "@/actions/friend-actions";
import { getAllGroups } from "@/actions/group-actions";
import { getFirebaseStorage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Badge } from "@/components/ui/badge";
import { ReportDialog } from "@/components/shared/ReportDialog";
import { S_sendInvitationEmail } from "@/actions/invitation-actions";


interface EditableUserFields {
  name: string;
  email: string;
  bio: string;
  interests: string[];
}

interface ProfileDisplayData {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  avatarFallback: string;
  bio: string;
  joinedDate: string;
  isOwnProfile: boolean;
  createdAt: string;
  interests: string[];
}

const USER_AVATAR_STORAGE_KEY_PREFIX = "userAvatar_";

const MAX_AVATAR_ORIGINAL_SIZE_MB = 2;
const AVATAR_TARGET_DIMENSION = 256;

const getDefaultVercelAvatar = (identifier: string | null | undefined): string => {
    const textIdentifier = identifier || 'User';
    const firstChar = (textIdentifier.charAt(0) || 'U').toUpperCase();
    return `https://avatar.vercel.sh/${encodeURIComponent(textIdentifier)}.png?text=${firstChar}`;
};

const translations = {
  en: {
    loadingTitle: "Loading Profile...",
    loadingDesc: "Fetching user information.",
    authErrorTitle: "Authentication Error",
    authErrorDesc: "Could not verify your session.",
    authFailedTitle: "Authentication Failed",
    authFailedDesc: (error: string) => `${error} Please try logging out and log back in.`,
    profileNotFoundTitle: "Profile Not Found",
    profileNotFoundDesc: (userId: string) => `The user profile for ID "${userId}" could not be loaded.`,
    userNotFoundTitle: "User Not Found",
    userNotFoundDesc: "We couldn't find a profile for this user.",
    goBack: "Go Back",
    myProfileTitle: "My Profile",
    otherProfileTitle: (name: string) => `${name}'s Profile`,
    myProfileDesc: "View and manage your personal information.",
    otherProfileDesc: (name: string) => `Viewing profile for ${name}.`,
    editProfile: "Edit Profile",
    loading: "Loading...",
    friends: "Friends",
    unfriendConfirmTitle: (name: string) => `Unfriend ${name}?`,
    unfriendConfirmDesc: (name: string) => `This action will remove ${name} from your friends list and you from theirs. You will no longer be able to message each other directly.`,
    cancel: "Cancel",
    unfriend: "Unfriend",
    requestSent: "Request Sent",
    cancelRequest: "Cancel Request",
    cancelRequestConfirmTitle: "Cancel Friend Request?",
    cancelRequestConfirmDesc: (name: string) => `Are you sure you want to cancel your friend request to ${name}?`,
    yesCancel: "Yes, Cancel",
    accept: "Accept",
    decline: "Decline",
    addFriend: "Add Friend",
    friendRequestSentToast: (name: string) => `Request sent to ${name}.`,
    friendRequestErrorToast: "Could not send friend request.",
    friendRequestCancelledToast: "Friend Request Cancelled",
    friendRequestCancelErrorToast: "Failed to cancel friend request.",
    friendRequestAcceptedToast: "Friend Request Accepted!",
    friendRequestDeclinedToast: "Friend Request Declined",
    friendRequestResponseErrorToast: "Could not respond to friend request.",
    unfriendedToast: "Unfriended",
    unfriendedToastDesc: (name: string) => `You are no longer friends with ${name}.`,
    unfriendErrorToast: "Could not unfriend.",
    fullNameLabel: "Full Name",
    emailLabel: "Email Address",
    emailCannotChange: "Email address cannot be changed here.",
    bioLabel: "Bio",
    bioPlaceholder: "Tell us a bit about yourself...",
    interestsLabel: "Interests",
    interestsPlaceholder: "e.g., hiking, coding, board games. Hit enter to add a tag.",
    noInterests: "No interests listed yet.",
    changePasswordTitle: "Change Password",
    changePasswordDesc: "Password changes are managed through your primary authentication provider and not available here.",
    saveChanges: "Save Changes",
    saving: "Saving...",
    dangerZone: "Danger Zone",
    dangerZoneDesc: "Deleting your account is permanent and cannot be undone. All your data will be permanently removed.",
    deleteMyAccount: "Delete My Account",
    deleteConfirmTitle: "Are you absolutely sure?",
    deleteConfirmDesc: "This action cannot be undone. This will permanently delete your account and remove your data from our servers.",
    yesDelete: "Yes, delete my account",
    friendRequestsTitle: "Friend Requests",
    friendRequestsDesc: "Manage your incoming friend requests.",
    noPendingRequests: "No pending friend requests.",
    wantsToBeFriend: "Wants to be your friend.",
    myFriendsTitle: "My Friends",
    myFriendsDesc: "Your current connections.",
    noFriends: "You haven't added any friends yet.",
    myGroupsTitle: "My Groups",
    myGroupsDesc: "Groups you are currently a member of.",
    noGroups: "You haven't joined any groups yet.",
    discoverGroups: "Discover Groups",
    viewGroup: "View Group",
    you: "You",
    updateFailed: "Update Failed",
    profileUpdated: "Profile Updated",
    profileUpdatedDesc: "Your profile information has been saved.",
    sessionError: "Session error, please try again.",
    nameRequiredError: "Name cannot be empty.",
    avatarSizeError: (size: number) => `Original image size should not exceed ${size}MB.`,
    avatarReadError: "Failed to read the image file.",
    changeAvatar: "Change avatar",
    removeAvatar: "Remove avatar",
    deleteAccountSuccessTitle: "Account Deleted",
    deleteAccountSuccessDesc: "Your account has been permanently deleted.",
    deleteAccountFailedTitle: "Deletion Failed",
    deleteAccountFailedDesc: "Could not delete your account. Please try logging in again.",
    actionNotAllowed: "Action Not Allowed",
    cannotRemoveSelf: "Cannot remove creator or self.",
    reportUser: "Report User",
    inviteFriendTitle: "Invite a Friend",
    inviteFriendDesc: "Send an email invitation to someone you think would love GroupHub.",
    invitePlaceholder: "friend@example.com",
    sendInvite: "Send Invite",
    sendingInvite: "Sending...",
    inviteSentTitle: "Invitation Sent!",
    inviteErrorTitle: "Error Sending Invite",
  },
  es: {
    loadingTitle: "Cargando Perfil...",
    loadingDesc: "Obteniendo información del usuario.",
    authErrorTitle: "Error de Autenticación",
    authErrorDesc: "No se pudo verificar tu sesión.",
    authFailedTitle: "Autenticación Fallida",
    authFailedDesc: (error: string) => `${error} Por favor, intenta cerrar sesión y volver a iniciarla.`,
    profileNotFoundTitle: "Perfil no Encontrado",
    profileNotFoundDesc: (userId: string) => `El perfil de usuario para el ID "${userId}" no se pudo cargar.`,
    userNotFoundTitle: "Usuario no Encontrado",
    userNotFoundDesc: "No pudimos encontrar un perfil para este usuario.",
    goBack: "Volver",
    myProfileTitle: "Mi Perfil",
    otherProfileTitle: (name: string) => `Perfil de ${name}`,
    myProfileDesc: "Ve y gestiona tu información personal.",
    otherProfileDesc: (name: string) => `Viendo el perfil de ${name}.`,
    editProfile: "Editar Perfil",
    loading: "Cargando...",
    friends: "Amigos",
    unfriendConfirmTitle: (name: string) => `¿Dejar de ser amigo de ${name}?`,
    unfriendConfirmDesc: (name: string) => `Esta acción eliminará a ${name} de tu lista de amigos y a ti de la suya. Ya no podrán enviarse mensajes directos.`,
    cancel: "Cancelar",
    unfriend: "Dejar de ser amigo",
    requestSent: "Solicitud Enviada",
    cancelRequest: "Cancelar Solicitud",
    cancelRequestConfirmTitle: "¿Cancelar Solicitud de Amistad?",
    cancelRequestConfirmDesc: (name: string) => `¿Estás seguro de que quieres cancelar tu solicitud de amistad a ${name}?`,
    yesCancel: "Sí, Cancelar",
    accept: "Aceptar",
    decline: "Rechazar",
    addFriend: "Añadir Amigo",
    friendRequestSentToast: (name: string) => `Solicitud enviada a ${name}.`,
    friendRequestErrorToast: "No se pudo enviar la solicitud de amistad.",
    friendRequestCancelledToast: "Solicitud de Amistad Cancelada",
    friendRequestCancelErrorToast: "No se pudo cancelar la solicitud de amistad.",
    friendRequestAcceptedToast: "¡Solicitud de Amistad Aceptada!",
    friendRequestDeclinedToast: "Solicitud de Amistad Rechazada",
    friendRequestResponseErrorToast: "No se pudo responder a la solicitud de amistad.",
    unfriendedToast: "Amistad eliminada",
    unfriendedToastDesc: (name: string) => `Ya no eres amigo de ${name}.`,
    unfriendErrorToast: "No se pudo eliminar la amistad.",
    fullNameLabel: "Nombre Completo",
    emailLabel: "Correo Electrónico",
    emailCannotChange: "La dirección de correo electrónico no se puede cambiar aquí.",
    bioLabel: "Biografía",
    bioPlaceholder: "Cuéntanos un poco sobre ti...",
    interestsLabel: "Intereses",
    interestsPlaceholder: "p.ej., senderismo, codificación, juegos de mesa. Presiona enter para añadir una etiqueta.",
    noInterests: "Aún no se han listado intereses.",
    changePasswordTitle: "Cambiar Contraseña",
    changePasswordDesc: "Los cambios de contraseña se gestionan a través de tu proveedor de autenticación principal y no están disponibles aquí.",
    saveChanges: "Guardar Cambios",
    saving: "Guardando...",
    dangerZone: "Zona de Peligro",
    dangerZoneDesc: "Eliminar tu cuenta es permanente y no se puede deshacer. Todos tus datos serán eliminados permanentemente.",
    deleteMyAccount: "Eliminar Mi Cuenta",
    deleteConfirmTitle: "¿Estás absolutamente seguro?",
    deleteConfirmDesc: "Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta y tus datos de nuestros servidores.",
    yesDelete: "Sí, eliminar mi cuenta",
    friendRequestsTitle: "Solicitudes de Amistad",
    friendRequestsDesc: "Gestiona tus solicitudes de amistad entrantes.",
    noPendingRequests: "No hay solicitudes de amistad pendientes.",
    wantsToBeFriend: "Quiere ser tu amigo.",
    myFriendsTitle: "Mis Amigos",
    myFriendsDesc: "Tus conexiones actuales.",
    noFriends: "Aún no has añadido a ningún amigo.",
    myGroupsTitle: "Mis Grupos",
    myGroupsDesc: "Grupos de los que eres miembro actualmente.",
    noGroups: "Aún no te has unido a ningún grupo.",
    discoverGroups: "Descubrir Grupos",
    viewGroup: "Ver Grupo",
    you: "Tú",
    updateFailed: "Actualización Fallida",
    profileUpdated: "Perfil Actualizado",
    profileUpdatedDesc: "Tu información de perfil ha sido guardada.",
    sessionError: "Error de sesión, por favor, inténtalo de nuevo.",
    nameRequiredError: "El nombre no puede estar vacío.",
    avatarSizeError: (size: number) => `El tamaño original de la imagen no debe exceder los ${size}MB.`,
    avatarReadError: "Error al leer el archivo de imagen.",
    changeAvatar: "Cambiar avatar",
    removeAvatar: "Eliminar avatar",
    deleteAccountSuccessTitle: "Cuenta Eliminada",
    deleteAccountSuccessDesc: "Tu cuenta ha sido eliminada permanentemente.",
    deleteAccountFailedTitle: "Error al Eliminar",
    deleteAccountFailedDesc: "No se pudo eliminar tu cuenta. Por favor, intenta iniciar sesión de nuevo.",
    actionNotAllowed: "Acción no Permitida",
    cannotRemoveSelf: "No se puede eliminar al creador o a ti mismo.",
    reportUser: "Reportar Usuario",
    inviteFriendTitle: "Invitar a un Amigo",
    inviteFriendDesc: "Envía una invitación por correo electrónico a alguien que creas que le encantaría GroupHub.",
    invitePlaceholder: "amigo@ejemplo.com",
    sendInvite: "Enviar Invitación",
    sendingInvite: "Enviando...",
    inviteSentTitle: "¡Invitación Enviada!",
    inviteErrorTitle: "Error al Enviar Invitación",
  },
  pt: {
    loadingTitle: "Carregando Perfil...",
    loadingDesc: "Buscando informações do usuário.",
    authErrorTitle: "Erro de Autenticação",
    authErrorDesc: "Não foi possível verificar sua sessão.",
    authFailedTitle: "Falha na Autenticação",
    authFailedDesc: (error: string) => `${error} Por favor, tente sair e entrar novamente.`,
    profileNotFoundTitle: "Perfil Não Encontrado",
    profileNotFoundDesc: (userId: string) => `O perfil de usuário para o ID "${userId}" não pôde ser carregado.`,
    userNotFoundTitle: "Usuário Não Encontrado",
    userNotFoundDesc: "Não conseguimos encontrar um perfil para este usuário.",
    goBack: "Voltar",
    myProfileTitle: "Meu Perfil",
    otherProfileTitle: (name: string) => `Perfil de ${name}`,
    myProfileDesc: "Veja e gerencie suas informações pessoais.",
    otherProfileDesc: (name: string) => `Visualizando o perfil de ${name}.`,
    editProfile: "Editar Perfil",
    loading: "Carregando...",
    friends: "Amigos",
    unfriendConfirmTitle: (name: string) => `Desfazer amizade com ${name}?`,
    unfriendConfirmDesc: (name: string) => `Esta ação removerá ${name} da sua lista de amigos e você da dele. Vocês não poderão mais trocar mensagens diretas.`,
    cancel: "Cancelar",
    unfriend: "Desfazer Amizade",
    requestSent: "Solicitação Enviada",
    cancelRequest: "Cancelar Solicitação",
    cancelRequestConfirmTitle: "Cancelar Solicitação de Amizade?",
    cancelRequestConfirmDesc: (name: string) => `Tem certeza de que deseja cancelar sua solicitação de amizade para ${name}?`,
    yesCancel: "Sim, Cancelar",
    accept: "Aceitar",
    decline: "Recusar",
    addFriend: "Adicionar Amigo",
    friendRequestSentToast: (name: string) => `Solicitação enviada para ${name}.`,
    friendRequestErrorToast: "Não foi possível enviar a solicitação de amizade.",
    friendRequestCancelledToast: "Solicitação de Amizade Cancelada",
    friendRequestCancelErrorToast: "Falha ao cancelar la solicitação de amizade.",
    friendRequestAcceptedToast: "Solicitação de Amizade Aceita!",
    friendRequestDeclinedToast: "Solicitação de Amizade Recusada",
    friendRequestResponseErrorToast: "Não foi possível responder à solicitação de amizade.",
    unfriendedToast: "Amizade desfeita",
    unfriendedToastDesc: (name: string) => `Você não é mais amigo de ${name}.`,
    unfriendErrorToast: "Não foi possível desfazer a amizade.",
    fullNameLabel: "Nome Completo",
    emailLabel: "Endereço de Email",
    emailCannotChange: "O endereço de e-mail não pode ser alterado aqui.",
    bioLabel: "Bio",
    bioPlaceholder: "Conte-nos um pouco sobre você...",
    interestsLabel: "Interesses",
    interestsPlaceholder: "ex: trilha, programação, jogos de tabuleiro. Pressione enter para adicionar uma tag.",
    noInterests: "Nenhum interesse listado ainda.",
    changePasswordTitle: "Alterar Senha",
    changePasswordDesc: "As alterações de senha são gerenciadas através do seu provedor de autenticação principal e não estão disponíveis aqui.",
    saveChanges: "Salvar Alterações",
    saving: "Salvando...",
    dangerZone: "Zona de Perigo",
    dangerZoneDesc: "Excluir sua conta é permanente e não pode ser desfeito. Todos os seus dados serão removidos permanentemente.",
    deleteMyAccount: "Excluir Minha Conta",
    deleteConfirmTitle: "Você tem certeza absoluta?",
    deleteConfirmDesc: "Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta e removerá seus dados de nossos servidores.",
    yesDelete: "Sim, excluir minha conta",
    friendRequestsTitle: "Solicitações de Amizade",
    friendRequestsDesc: "Gerencie suas solicitações de amizade recebidas.",
    noPendingRequests: "Nenhuma solicitação de amizade pendente.",
    wantsToBeFriend: "Quer ser seu amigo.",
    myFriendsTitle: "Meus Amigos",
    myFriendsDesc: "Suas conexões atuais.",
    noFriends: "Você ainda não adicionou nenhum amigo.",
    myGroupsTitle: "Meus Grupos",
    myGroupsDesc: "Grupos dos quais você é membro atualmente.",
    noGroups: "Você ainda não entrou em nenhum grupo.",
    discoverGroups: "Descobrir Grupos",
    viewGroup: "Ver Grupo",
    you: "Você",
    updateFailed: "Falha na Atualização",
    profileUpdated: "Perfil Atualizado",
    profileUpdatedDesc: "Suas informações de perfil foram salvas.",
    sessionError: "Erro de sessão, por favor, tente novamente.",
    nameRequiredError: "O nome não pode estar em branco.",
    avatarSizeError: (size: number) => `O tamanho original da imagem não deve exceder ${size}MB.`,
    avatarReadError: "Falha ao ler o arquivo de imagem.",
    changeAvatar: "Alterar avatar",
    removeAvatar: "Remover avatar",
    deleteAccountSuccessTitle: "Conta Excluída",
    deleteAccountSuccessDesc: "Sua conta foi excluída permanentemente.",
    deleteAccountFailedTitle: "Falha na Exclusão",
    deleteAccountFailedDesc: "Não foi possível excluir sua conta. Por favor, tente fazer login novamente.",
    actionNotAllowed: "Ação Não Permitida",
    cannotRemoveSelf: "Não é possível remover o criador ou a si mesmo.",
    reportUser: "Denunciar Usuário",
    inviteFriendTitle: "Convidar um Amigo",
    inviteFriendDesc: "Envie um convite por e-mail para alguém que você acha que adoraria o GroupHub.",
    invitePlaceholder: "amigo@exemplo.com",
    sendInvite: "Enviar Convite",
    sendingInvite: "Enviando...",
    inviteSentTitle: "Convite Enviado!",
    inviteErrorTitle: "Erro ao Enviar Convite",
  },
  fr: {
    loadingTitle: "Chargement du Profil...",
    loadingDesc: "Récupération des informations de l'utilisateur.",
    authErrorTitle: "Erreur d'Authentification",
    authErrorDesc: "Impossible de vérifier votre session.",
    authFailedTitle: "Échec de l'Authentification",
    authFailedDesc: (error: string) => `${error} Veuillez essayer de vous déconnecter et de vous reconnecter.`,
    profileNotFoundTitle: "Profil Introuvable",
    profileNotFoundDesc: (userId: string) => `Le profil utilisateur pour l'ID "${userId}" n'a pas pu être chargé.`,
    userNotFoundTitle: "Utilisateur Introuvable",
    userNotFoundDesc: "Nous n'avons pas pu trouver de profil pour cet utilisateur.",
    goBack: "Retour",
    myProfileTitle: "Mon Profil",
    otherProfileTitle: (name: string) => `Profil de ${name}`,
    myProfileDesc: "Consultez et gérez vos informations personnelles.",
    otherProfileDesc: (name: string) => `Consultation du profil de ${name}.`,
    editProfile: "Modifier le Profil",
    loading: "Chargement...",
    friends: "Amis",
    unfriendConfirmTitle: (name: string) => `Retirer ${name} de vos amis ?`,
    unfriendConfirmDesc: (name: string) => `Cette action retirera ${name} de votre liste d'amis et vous de la sienne. Vous ne pourrez plus vous envoyer de messages directs.`,
    cancel: "Annuler",
    unfriend: "Retirer des amis",
    requestSent: "Demande Envoyée",
    cancelRequest: "Annuler la Demande",
    cancelRequestConfirmTitle: "Annuler la Demande d'Ami ?",
    cancelRequestConfirmDesc: (name: string) => `Êtes-vous sûr de vouloir annuler votre demande d'ami à ${name} ?`,
    yesCancel: "Oui, Annuler",
    accept: "Accepter",
    decline: "Refuser",
    addFriend: "Ajouter un Ami",
    friendRequestSentToast: (name: string) => `Demande envoyée à ${name}.`,
    friendRequestErrorToast: "Impossible d'envoyer la demande d'ami.",
    friendRequestCancelledToast: "Demande d'Ami Annulée",
    friendRequestCancelErrorToast: "Échec de l'annulation de la demande d'ami.",
    friendRequestAcceptedToast: "Demande d'Ami Acceptée !",
    friendRequestDeclinedToast: "Demande d'Ami Refusée",
    friendRequestResponseErrorToast: "Impossible de répondre à la demande d'ami.",
    unfriendedToast: "Retiré des amis",
    unfriendedToastDesc: (name: string) => `Vous n'êtes plus ami avec ${name}.`,
    unfriendErrorToast: "Impossible de retirer des amis.",
    fullNameLabel: "Nom Complet",
    emailLabel: "Adresse E-mail",
    emailCannotChange: "L'adresse e-mail ne peut pas être modifiée ici.",
    bioLabel: "Bio",
    bioPlaceholder: "Parlez-nous un peu de vous...",
    interestsLabel: "Intérêts",
    interestsPlaceholder: "ex : randonnée, code, jeux de société. Appuyez sur Entrée pour ajouter une étiquette.",
    noInterests: "Aucun intérêt listé pour le moment.",
    changePasswordTitle: "Changer le Mot de Passe",
    changePasswordDesc: "Les changements de mot de passe sont gérés par votre fournisseur d'authentification principal et ne sont pas disponibles ici.",
    saveChanges: "Enregistrer les Modifications",
    saving: "Enregistrement...",
    dangerZone: "Zone de Danger",
    dangerZoneDesc: "La suppression de votre compte est permanente et irréversible. Toutes vos données seront définitivement supprimées.",
    deleteMyAccount: "Supprimer Mon Compte",
    deleteConfirmTitle: "Êtes-vous absolument sûr ?",
    deleteConfirmDesc: "Cette action est irréversible. Elle supprimera définitivement votre compte et vos données de nos serveurs.",
    yesDelete: "Oui, supprimer mon compte",
    friendRequestsTitle: "Demandes d'Ami",
    friendRequestsDesc: "Gérez vos demandes d'ami entrantes.",
    noPendingRequests: "Aucune demande d'ami en attente.",
    wantsToBeFriend: "Souhaite devenir votre ami.",
    myFriendsTitle: "Mes Amis",
    myFriendsDesc: "Vos connexions actuelles.",
    noFriends: "Vous n'avez pas encore ajouté d'amis.",
    myGroupsTitle: "Mes Groupes",
    myGroupsDesc: "Groupes dont vous êtes actuellement membre.",
    noGroups: "Vous n'avez rejoint aucun groupe pour le moment.",
    discoverGroups: "Découvrir des Groupes",
    viewGroup: "Voir le Groupe",
    you: "Vous",
    updateFailed: "Échec de la Mise à Jour",
    profileUpdated: "Profil Mis à Jour",
    profileUpdatedDesc: "Vos informations de profil ont été enregistrées.",
    sessionError: "Erreur de session, veuillez réessayer.",
    nameRequiredError: "Le nom ne peut pas être vide.",
    avatarSizeError: (size: number) => `La taille de l'image originale ne doit pas dépasser ${size}Mo.`,
    avatarReadError: "Échec de la lecture du fichier image.",
    changeAvatar: "Changer d'avatar",
    removeAvatar: "Supprimer l'avatar",
    deleteAccountSuccessTitle: "Compte Supprimé",
    deleteAccountSuccessDesc: "Votre compte a été supprimé définitivement.",
    deleteAccountFailedTitle: "Échec de la Suppression",
    deleteAccountFailedDesc: "Impossible de supprimer votre compte. Veuillez essayer de vous reconnecter.",
    actionNotAllowed: "Action non autorisée",
    cannotRemoveSelf: "Impossible de se supprimer soi-même ou le créateur.",
    reportUser: "Signaler l'Utilisateur",
    inviteFriendTitle: "Inviter un Ami",
    inviteFriendDesc: "Envoyez une invitation par e-mail à quelqu'un qui, selon vous, adorerait GroupHub.",
    invitePlaceholder: "ami@example.com",
    sendInvite: "Envoyer l'Invitation",
    sendingInvite: "Envoi...",
    inviteSentTitle: "Invitation Envoyée !",
    inviteErrorTitle: "Erreur lors de l'Envoi de l'Invitation",
  },
  de: {
    loadingTitle: "Profil wird geladen...",
    loadingDesc: "Benutzerinformationen werden abgerufen.",
    authErrorTitle: "Authentifizierungsfehler",
    authErrorDesc: "Ihre Sitzung konnte nicht überprüft werden.",
    authFailedTitle: "Authentifizierung fehlgeschlagen",
    authFailedDesc: (error: string) => `${error} Bitte versuchen Sie, sich ab- und wieder anzumelden.`,
    profileNotFoundTitle: "Profil nicht gefunden",
    profileNotFoundDesc: (userId: string) => `Das Benutzerprofil für die ID "${userId}" konnte nicht geladen werden.`,
    userNotFoundTitle: "Benutzer nicht gefunden",
    userNotFoundDesc: "Wir konnten kein Profil für diesen Benutzer finden.",
    goBack: "Zurück",
    myProfileTitle: "Mein Profil",
    otherProfileTitle: (name: string) => `Profil von ${name}`,
    myProfileDesc: "Sehen und verwalten Sie Ihre persönlichen Informationen.",
    otherProfileDesc: (name: string) => `Profil von ${name} wird angezeigt.`,
    editProfile: "Profil bearbeiten",
    loading: "Wird geladen...",
    friends: "Freunde",
    unfriendConfirmTitle: (name: string) => `Freundschaft mit ${name} beenden?`,
    unfriendConfirmDesc: (name: string) => `Diese Aktion entfernt ${name} aus Ihrer Freundesliste und Sie aus seiner. Sie können sich dann keine Direktnachrichten mehr senden.`,
    cancel: "Abbrechen",
    unfriend: "Freundschaft beenden",
    requestSent: "Anfrage gesendet",
    cancelRequest: "Anfrage zurückziehen",
    cancelRequestConfirmTitle: "Freundschaftsanfrage zurückziehen?",
    cancelRequestConfirmDesc: (name: string) => `Möchten Sie Ihre Freundschaftsanfrage an ${name} wirklich zurückziehen?`,
    yesCancel: "Ja, zurückziehen",
    accept: "Annehmen",
    decline: "Ablehnen",
    addFriend: "Freund hinzufügen",
    friendRequestSentToast: (name: string) => `Anfrage an ${name} gesendet.`,
    friendRequestErrorToast: "Freundschaftsanfrage konnte nicht gesendet werden.",
    friendRequestCancelledToast: "Freundschaftsanfrage zurückgezogen",
    friendRequestCancelErrorToast: "Freundschaftsanfrage konnte nicht zurückgezogen werden.",
    friendRequestAcceptedToast: "Freundschaftsanfrage angenommen!",
    friendRequestDeclinedToast: "Freundschaftsanfrage abgelehnt",
    friendRequestResponseErrorToast: "Auf Freundschaftsanfrage konnte nicht geantwortet werden.",
    unfriendedToast: "Freundschaft beendet",
    unfriendedToastDesc: (name: string) => `Sie sind nicht mehr mit ${name} befreundet.`,
    unfriendErrorToast: "Freundschaft konnte nicht beendet werden.",
    fullNameLabel: "Vollständiger Name",
    emailLabel: "E-Mail-Adresse",
    emailCannotChange: "Die E-Mail-Adresse kann hier nicht geändert werden.",
    bioLabel: "Bio",
    bioPlaceholder: "Erzählen Sie uns etwas über sich...",
    interestsLabel: "Interessen",
    interestsPlaceholder: "z.B. Wandern, Programmieren, Brettspiele. Drücken Sie die Eingabetaste, um ein Tag hinzuzufügen.",
    noInterests: "Noch keine Interessen angegeben.",
    changePasswordTitle: "Passwort ändern",
    changePasswordDesc: "Passwortänderungen werden über Ihren primären Authentifizierungsanbieter verwaltet und sind hier nicht verfügbar.",
    saveChanges: "Änderungen speichern",
    saving: "Wird gespeichert...",
    dangerZone: "Gefahrenzone",
    dangerZoneDesc: "Das Löschen Ihres Kontos ist endgültig und kann nicht rückgängig gemacht werden. Alle Ihre Daten werden dauerhaft entfernt.",
    deleteMyAccount: "Mein Konto löschen",
    deleteConfirmTitle: "Sind Sie absolut sicher?",
    deleteConfirmDesc: "Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird Ihr Konto dauerhaft gelöscht und Ihre Daten von unseren Servern entfernt.",
    yesDelete: "Ja, mein Konto löschen",
    friendRequestsTitle: "Freundschaftsanfragen",
    friendRequestsDesc: "Verwalten Sie Ihre eingehenden Freundschaftsanfragen.",
    noPendingRequests: "Keine ausstehenden Freundschaftsanfragen.",
    wantsToBeFriend: "Möchte Ihr Freund sein.",
    myFriendsTitle: "Meine Freunde",
    myFriendsDesc: "Ihre aktuellen Verbindungen.",
    noFriends: "Sie haben noch keine Freunde hinzugefügt.",
    myGroupsTitle: "Meine Gruppen",
    myGroupsDesc: "Gruppen, in denen Sie derzeit Mitglied sind.",
    noGroups: "Sie sind noch keinen Gruppen beigetreten.",
    discoverGroups: "Gruppen entdecken",
    viewGroup: "Gruppe ansehen",
    you: "Sie",
    updateFailed: "Aktualisierung fehlgeschlagen",
    profileUpdated: "Profil aktualisiert",
    profileUpdatedDesc: "Ihre Profilinformationen wurden gespeichert.",
    sessionError: "Sitzungsfehler, bitte versuchen Sie es erneut.",
    nameRequiredError: "Name darf nicht leer sein.",
    avatarSizeError: (size: number) => `Die Originalbildgröße sollte ${size}MB nicht überschreiten.`,
    avatarReadError: "Fehler beim Lesen der Bilddatei.",
    changeAvatar: "Avatar ändern",
    removeAvatar: "Avatar entfernen",
    deleteAccountSuccessTitle: "Konto gelöscht",
    deleteAccountSuccessDesc: "Ihr Konto wurde dauerhaft gelöscht.",
    deleteAccountFailedTitle: "Löschen fehlgeschlagen",
    deleteAccountFailedDesc: "Ihr Konto konnte nicht gelöscht werden. Bitte versuchen Sie, sich erneut anzumelden.",
    actionNotAllowed: "Aktion nicht erlaubt",
    cannotRemoveSelf: "Ersteller oder sich selbst entfernen nicht möglich.",
    reportUser: "Benutzer melden",
    inviteFriendTitle: "Einen Freund einladen",
    inviteFriendDesc: "Senden Sie eine E-Mail-Einladung an jemanden, von dem Sie glauben, dass er GroupHub lieben würde.",
    invitePlaceholder: "freund@beispiel.com",
    sendInvite: "Einladung senden",
    sendingInvite: "Senden...",
    inviteSentTitle: "Einladung gesendet!",
    inviteErrorTitle: "Fehler beim Senden der Einladung",
  },
  it: {
    loadingTitle: "Caricamento Profilo...",
    loadingDesc: "Recupero informazioni utente.",
    authErrorTitle: "Errore di Autenticazione",
    authErrorDesc: "Impossibile verificare la tua sessione.",
    authFailedTitle: "Autenticazione Fallita",
    authFailedDesc: (error: string) => `${error} Prova a disconnetterti e a riaccedere.`,
    profileNotFoundTitle: "Profilo non Trovato",
    profileNotFoundDesc: (userId: string) => `Il profilo utente per l'ID "${userId}" non è stato caricato.`,
    userNotFoundTitle: "Utente non Trovato",
    userNotFoundDesc: "Non siamo riusciti a trovare un profilo per questo utente.",
    goBack: "Torna Indietro",
    myProfileTitle: "Il Mio Profilo",
    otherProfileTitle: (name: string) => `Profilo di ${name}`,
    myProfileDesc: "Visualizza e gestisci le tue informazioni personali.",
    otherProfileDesc: (name: string) => `Visualizzazione del profilo di ${name}.`,
    editProfile: "Modifica Profilo",
    loading: "Caricamento...",
    friends: "Amici",
    unfriendConfirmTitle: (name: string) => `Rimuovere ${name} dagli amici?`,
    unfriendConfirmDesc: (name: string) => `Questa azione rimuoverà ${name} dalla tua lista di amici e tu dalla sua. Non potrete più inviarvi messaggi diretti.`,
    cancel: "Annulla",
    unfriend: "Rimuovi dagli amici",
    requestSent: "Richiesta Inviata",
    cancelRequest: "Annulla Richiesta",
    cancelRequestConfirmTitle: "Annullare la Richiesta di Amicizia?",
    cancelRequestConfirmDesc: (name: string) => `Sei sicuro di voler annullare la tua richiesta di amicizia a ${name}?`,
    yesCancel: "Sì, Annulla",
    accept: "Accetta",
    decline: "Rifiuta",
    addFriend: "Aggiungi Amico",
    friendRequestSentToast: (name: string) => `Richiesta inviata a ${name}.`,
    friendRequestErrorToast: "Impossibile inviare la richiesta di amicizia.",
    friendRequestCancelledToast: "Richiesta di Amicizia Annullata",
    friendRequestCancelErrorToast: "Impossibile annullare la richiesta di amicizia.",
    friendRequestAcceptedToast: "Richiesta di Amicizia Accettata!",
    friendRequestDeclinedToast: "Richiesta di Amicizia Rifiutata",
    friendRequestResponseErrorToast: "Impossibile rispondere alla richiesta di amicizia.",
    unfriendedToast: "Amicizia rimossa",
    unfriendedToastDesc: (name: string) => `Non sei più amico di ${name}.`,
    unfriendErrorToast: "Impossibile rimuovere l'amicizia.",
    fullNameLabel: "Nome Completo",
    emailLabel: "Indirizzo Email",
    emailCannotChange: "L'indirizzo email non può essere modificato qui.",
    bioLabel: "Bio",
    bioPlaceholder: "Raccontaci un po' di te...",
    interestsLabel: "Interessi",
    interestsPlaceholder: "es. trekking, programmazione, giochi da tavolo. Premi invio per aggiungere un tag.",
    noInterests: "Nessun interesse elencato.",
    changePasswordTitle: "Cambia Password",
    changePasswordDesc: "Le modifiche alla password sono gestite tramite il tuo provider di autenticazione principale e non sono disponibili qui.",
    saveChanges: "Salva Modifiche",
    saving: "Salvataggio...",
    dangerZone: "Zona Pericolosa",
    dangerZoneDesc: "L'eliminazione del tuo account è permanente e non può essere annullata. Tutti i tuoi dati saranno rimossi in modo permanente.",
    deleteMyAccount: "Elimina il Mio Account",
    deleteConfirmTitle: "Sei assolutamente sicuro?",
    deleteConfirmDesc: "Questa azione non può essere annullata. Eliminerà permanentemente il tuo account e rimuoverà i tuoi dati dai nostri server.",
    yesDelete: "Sì, elimina il mio account",
    friendRequestsTitle: "Richieste di Amicizia",
    friendRequestsDesc: "Gestisci le tue richieste di amicizia in arrivo.",
    noPendingRequests: "Nessuna richiesta di amicizia in sospeso.",
    wantsToBeFriend: "Vuole essere tuo amico.",
    myFriendsTitle: "I Miei Amici",
    myFriendsDesc: "Le tue connessioni attuali.",
    noFriends: "Non hai ancora aggiunto nessun amico.",
    myGroupsTitle: "I Miei Gruppi",
    myGroupsDesc: "Gruppi di cui sei attualmente membro.",
    noGroups: "Non ti sei ancora unito a nessun gruppo.",
    discoverGroups: "Scopri Gruppi",
    viewGroup: "Vedi Gruppo",
    you: "Tu",
    updateFailed: "Aggiornamento Fallito",
    profileUpdated: "Profilo Aggiornato",
    profileUpdatedDesc: "Le tue informazioni del profilo sono state salvate.",
    sessionError: "Errore di sessione, riprova.",
    nameRequiredError: "Il nome non può essere vuoto.",
    avatarSizeError: (size: number) => `La dimensione originale dell'immagine non deve superare ${size}MB.`,
    avatarReadError: "Errore durante la lettura del file immagine.",
    changeAvatar: "Cambia avatar",
    removeAvatar: "Rimuovi avatar",
    deleteAccountSuccessTitle: "Account Eliminato",
    deleteAccountSuccessDesc: "Il tuo account è stato eliminato in modo permanente.",
    deleteAccountFailedTitle: "Eliminazione Fallita",
    deleteAccountFailedDesc: "Impossibile eliminare il tuo account. Prova a effettuare nuovamente il login.",
    actionNotAllowed: "Azione non consentita",
    cannotRemoveSelf: "Impossibile rimuovere il creatore o te stesso.",
    reportUser: "Segnala Utente",
    inviteFriendTitle: "Invita un Amico",
    inviteFriendDesc: "Invia un invito via email a qualcuno che pensi possa amare GroupHub.",
    invitePlaceholder: "amico@esempio.com",
    sendInvite: "Invia Invito",
    sendingInvite: "Invio in corso...",
    inviteSentTitle: "Invito Inviato!",
    inviteErrorTitle: "Errore nell'Invio dell'Invito",
  },
  ru: {
    loadingTitle: "Загрузка профиля...",
    loadingDesc: "Получение информации о пользователе.",
    authErrorTitle: "Ошибка аутентификации",
    authErrorDesc: "Не удалось подтвердить вашу сессию.",
    authFailedTitle: "Ошибка аутентификации",
    authFailedDesc: (error: string) => `${error} Пожалуйста, попробуйте выйти и снова войти.`,
    profileNotFoundTitle: "Профиль не найден",
    profileNotFoundDesc: (userId: string) => `Профиль пользователя с ID "${userId}" не удалось загрузить.`,
    userNotFoundTitle: "Пользователь не найден",
    userNotFoundDesc: "Мы не смогли найти профиль для этого пользователя.",
    goBack: "Назад",
    myProfileTitle: "Мой профиль",
    otherProfileTitle: (name: string) => `Профиль ${name}`,
    myProfileDesc: "Просмотр и управление вашей личной информацией.",
    otherProfileDesc: (name: string) => `Просмотр профиля ${name}.`,
    editProfile: "Редактировать профиль",
    loading: "Загрузка...",
    friends: "Друзья",
    unfriendConfirmTitle: (name: string) => `Удалить ${name} из друзей?`,
    unfriendConfirmDesc: (name: string) => `Это действие удалит ${name} из вашего списка друзей, а вас из его. Вы больше не сможете отправлять друг другу личные сообщения.`,
    cancel: "Отмена",
    unfriend: "Удалить из друзей",
    requestSent: "Запрос отправлен",
    cancelRequest: "Отменить запрос",
    cancelRequestConfirmTitle: "Отменить запрос в друзья?",
    cancelRequestConfirmDesc: (name: string) => `Вы уверены, что хотите отменить запрос в друзья к ${name}?`,
    yesCancel: "Да, отменить",
    accept: "Принять",
    decline: "Отклонить",
    addFriend: "Добавить в друзья",
    friendRequestSentToast: (name: string) => `Запрос отправлен ${name}.`,
    friendRequestErrorToast: "Не удалось отправить запрос в друзья.",
    friendRequestCancelledToast: "Запрос в друзья отменен",
    friendRequestCancelErrorToast: "Не удалось отменить запрос в друзья.",
    friendRequestAcceptedToast: "Запрос в друзья принят!",
    friendRequestDeclinedToast: "Запрос в друзья отклонен",
    friendRequestResponseErrorToast: "Не удалось ответить на запрос в друзья.",
    unfriendedToast: "Дружба прекращена",
    unfriendedToastDesc: (name: string) => `Вы больше не дружите с ${name}.`,
    unfriendErrorToast: "Не удалось прекратить дружбу.",
    fullNameLabel: "Полное имя",
    emailLabel: "Адрес электронной почты",
    emailCannotChange: "Адрес электронной почты здесь изменить нельзя.",
    bioLabel: "О себе",
    bioPlaceholder: "Расскажите немного о себе...",
    interestsLabel: "Интересы",
    interestsPlaceholder: "например, походы, кодинг, настольные игры. Нажмите Enter, чтобы добавить тег.",
    noInterests: "Интересы еще не указаны.",
    changePasswordTitle: "Изменить пароль",
    changePasswordDesc: "Изменение пароля управляется через вашего основного провайдера аутентификации и здесь недоступно.",
    saveChanges: "Сохранить изменения",
    saving: "Сохранение...",
    dangerZone: "Опасная зона",
    dangerZoneDesc: "Удаление вашей учетной записи является необратимым. Все ваши данные будут удалены навсегда.",
    deleteMyAccount: "Удалить мою учетную запись",
    deleteConfirmTitle: "Вы абсолютно уверены?",
    deleteConfirmDesc: "Это действие нельзя отменить. Ваша учетная запись и все данные будут навсегда удалены с наших серверов.",
    yesDelete: "Да, удалить мой аккаунт",
    friendRequestsTitle: "Запросы в друзья",
    friendRequestsDesc: "Управляйте вашими входящими запросами в друзья.",
    noPendingRequests: "Нет ожидающих запросов в друзья.",
    wantsToBeFriend: "Хочет стать вашим другом.",
    myFriendsTitle: "Мои друзья",
    myFriendsDesc: "Ваши текущие связи.",
    noFriends: "Вы еще не добавили друзей.",
    myGroupsTitle: "Мои группы",
    myGroupsDesc: "Группы, в которых вы сейчас состоите.",
    noGroups: "Вы еще не вступили ни в одну группу.",
    discoverGroups: "Найти группы",
    viewGroup: "Просмотр группы",
    you: "Вы",
    updateFailed: "Ошибка обновления",
    profileUpdated: "Профиль обновлен",
    profileUpdatedDesc: "Информация вашего профиля сохранена.",
    sessionError: "Ошибка сессии, пожалуйста, попробуйте еще раз.",
    nameRequiredError: "Имя не может быть пустым.",
    avatarSizeError: (size: number) => `Размер исходного изображения не должен превышать ${size} МБ.`,
    avatarReadError: "Не удалось прочитать файл изображения.",
    changeAvatar: "Изменить аватар",
    removeAvatar: "Удалить аватар",
    deleteAccountSuccessTitle: "Учетная запись удалена",
    deleteAccountSuccessDesc: "Ваша учетная запись была удалена навсегда.",
    deleteAccountFailedTitle: "Ошибка удаления",
    deleteAccountFailedDesc: "Не удалось удалить вашу учетную запись. Пожалуйста, попробуйте войти снова.",
    actionNotAllowed: "Действие не разрешено",
    cannotRemoveSelf: "Невозможно удалить создателя или себя.",
    reportUser: "Пожаловаться на пользователя",
    inviteFriendTitle: "Пригласить друга",
    inviteFriendDesc: "Отправьте приглашение по электронной почте тому, кто, по вашему мнению, полюбит GroupHub.",
    invitePlaceholder: "drug@example.com",
    sendInvite: "Отправить приглашение",
    sendingInvite: "Отправка...",
    inviteSentTitle: "Приглашение отправлено!",
    inviteErrorTitle: "Ошибка отправки приглашения",
  }
};


export default function UserProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const { currentUser, loading: authLoading, error: authErrorHook, updateCurrentUserProfile: updateFirebaseAuthProfile, deleteAccount, authInstance } = useAuth();
  const { toast } = useToast();
  
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const [profileData, setProfileData] = useState<ProfileDisplayData | null>(null);
  const [formState, setFormState] = useState<EditableUserFields>({ name: "", email: "", bio: "", interests: [] });
  
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarAction, setAvatarAction] = useState<'keep' | 'new_upload' | 'remove'>('keep');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [interestInput, setInterestInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [memberGroups, setMemberGroups] = useState<StoredGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  const [friendshipStatus, setFriendshipStatus] = useState<'friends' | 'request_sent' | 'request_received' | 'not_friends' | 'loading'>('loading');
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<FriendRequest[]>([]);
  const [currentUserFriends, setCurrentUserFriends] = useState<ContactableUser[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

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
    if (profileData) {
      document.title = `${profileData.displayName} | GroupHub`;
    }
  }, [profileData]);

  const fetchProfileAndFriendData = useCallback(async () => {
    if (authLoading) {
      setIsLoadingProfile(true);
      return;
    }
    setIsLoadingProfile(true);

    const viewingUserId = params.userId;
    if (!viewingUserId) {
      setProfileData(null); setIsLoadingProfile(false); return;
    }
    
    let isOwn = false;
    if (currentUser) {
        isOwn = currentUser.uid === viewingUserId;
    }
    
    let displayDataInput: Partial<ProfileDisplayData> = { userId: viewingUserId, isOwnProfile: isOwn };
    let serverBio: string;
    let serverAvatarUrlForDisplay: string | undefined; 
    let serverCreatedAt: string;
    let serverInterests: string[];

    try {
      const serverProfile = await getUserProfile(viewingUserId); 
      
      if (!serverProfile) {
        // Handle case where profile doesn't exist in DB
        setProfileData(null);
        setIsLoadingProfile(false);
        return;
      }

      serverBio = serverProfile.bio || "";
      serverAvatarUrlForDisplay = serverProfile.avatarUrl; // Will be a valid URL or undefined
      serverCreatedAt = serverProfile.createdAt || new Date(0).toISOString();
      serverInterests = serverProfile.interests || [];

      let userJoinedDate = "Not available";
      const defaultVercelForViewedUser = getDefaultVercelAvatar(viewingUserId);

      if (isOwn && currentUser) {
        userJoinedDate = currentUser.metadata?.creationTime
            ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-CA')
            : "Not available";
        
        const firebaseAuthPhotoUrl = currentUser.photoURL; 

        displayDataInput = {
            ...displayDataInput,
            displayName: currentUser.displayName || getUsernameFromEmail(currentUser.email),
            email: currentUser.email || "No email provided",
            avatarUrl: serverAvatarUrlForDisplay || firebaseAuthPhotoUrl || getDefaultVercelAvatar(currentUser.email || currentUser.uid),
            avatarFallback: (currentUser.displayName || getUsernameFromEmail(currentUser.email)).charAt(0).toUpperCase(),
            bio: serverBio,
            joinedDate: userJoinedDate,
            createdAt: serverCreatedAt,
            interests: serverInterests,
        };
        setFormState({ name: displayDataInput.displayName!, email: displayDataInput.email!, bio: serverBio, interests: serverInterests });
        setAvatarPreview(displayDataInput.avatarUrl!);

      } else { 
        const viewedUserContactDetails = await S_getUserFromAllUsersList(viewingUserId); 
        
        if (!viewedUserContactDetails) {
            setProfileData(null);
            setIsLoadingProfile(false);
            return;
        }

        displayDataInput = {
            ...displayDataInput,
            displayName: viewedUserContactDetails?.name || "User",
            email: "Email hidden for other users", 
            avatarUrl: serverAvatarUrlForDisplay || viewedUserContactDetails?.avatar || defaultVercelForViewedUser,
            avatarFallback: (viewedUserContactDetails?.name || "U").charAt(0).toUpperCase(),
            bio: serverBio,
            joinedDate: serverCreatedAt ? new Date(serverCreatedAt).toLocaleDateString('en-CA') : "Not available",
            createdAt: serverCreatedAt,
            interests: serverInterests,
        };
      }
      setProfileData(displayDataInput as ProfileDisplayData);

    } catch (e: any) {
        console.error("[UserProfilePage] Error loading profile data:", e);
        setProfileData(null);
    }

    if (isOwn && currentUser) {
      setIsLoadingGroups(true);
      try {
        const allGroupsFromServer = await getAllGroups();
        const userMemberGroups = allGroupsFromServer.filter(group => {
           return Array.isArray(group.memberIds) && group.memberIds.includes(currentUser!.uid);
        }).map(g => ({ ...g }));
        setMemberGroups(userMemberGroups);
      } catch (e) { console.error("[UserProfilePage] Error loading groups from server action:", e); setMemberGroups([]); }
      setIsLoadingGroups(false);

      try {
        const pendingReqs = await S_getPendingFriendRequests(currentUser.uid);
        setIncomingFriendRequests(pendingReqs);
      } catch (e) { console.error("[UserProfilePage] Error loading friend requests:", e); setIncomingFriendRequests([]); }

      try {
        const friends = await S_getUserFriends(currentUser.uid); 
        setCurrentUserFriends(friends);
      } catch(e) { console.error("[UserProfilePage] Error loading friends list:", e); setCurrentUserFriends([]);}

    } else if (currentUser) { 
      setFriendshipStatus('loading');
      try {
        const status = await S_getFriendshipStatus(currentUser.uid, viewingUserId);
        setFriendshipStatus(status);
      } catch (e) {
        console.error("[UserProfilePage] Error determining friendship status:", e);
        setFriendshipStatus('not_friends');
      }
    } else { 
        setFriendshipStatus('not_friends');
    }
    setIsLoadingProfile(false);
  }, [authLoading, currentUser, params.userId, t]); 

  useEffect(() => {
    fetchProfileAndFriendData();
  }, [fetchProfileAndFriendData]);


  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFormError(null);
      return;
    }
    setFormError(null);

    if (file.size > MAX_AVATAR_ORIGINAL_SIZE_MB * 1024 * 1024) {
      setFormError(t.avatarSizeError(MAX_AVATAR_ORIGINAL_SIZE_MB));
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }
    
    setSelectedAvatarFile(file); 
    setAvatarPreview(URL.createObjectURL(file)); 
    setAvatarAction('new_upload');
  };

  const handleRemoveAvatar = () => {
    if (!currentUser) return;
    setAvatarAction('remove');
    setSelectedAvatarFile(null);
    setAvatarPreview(getDefaultVercelAvatar(currentUser.email || currentUser.uid));
    setFormError(null);
    if (avatarInputRef.current) avatarInputRef.current.value = ""; 
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormState(prevState => ({ ...prevState, [id]: value }));
    setFormError(null);
  };
  
  const handleInterestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && interestInput.trim()) {
        e.preventDefault();
        const newInterest = interestInput.trim().toLowerCase();
        if (newInterest && !formState.interests.includes(newInterest)) {
            setFormState(prevState => ({...prevState, interests: [...prevState.interests, newInterest]}));
        }
        setInterestInput("");
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setFormState(prevState => ({...prevState, interests: prevState.interests.filter(i => i !== interestToRemove)}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData?.isOwnProfile || !currentUser || !authInstance) return;
    
    setIsSubmittingProfile(true);
    setFormError(null);

    if (!formState.name.trim()) {
        setFormError(t.nameRequiredError); 
        setIsSubmittingProfile(false);
        return;
    }

    let idToken = "";
    try {
      idToken = await currentUser.getIdToken();
    } catch (tokenError) {
      setFormError(t.sessionError);
      setIsSubmittingProfile(false);
      return;
    }
    
    let finalFirebasePhotoURL: string | null = currentUser.photoURL; 

    try {
      if (avatarAction === 'new_upload' && selectedAvatarFile) {
        const canvas = document.createElement('canvas');
        const img = new window.Image(); 
        img.src = URL.createObjectURL(selectedAvatarFile);
        await new Promise(resolve => img.onload = resolve);

        let targetWidth = AVATAR_TARGET_DIMENSION;
        let targetHeight = AVATAR_TARGET_DIMENSION;
        const S = Math.min(img.width, img.height);
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const sx = (img.width - S) / 2;
        const sy = (img.height - S) / 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context not available for image processing.");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, sx, sy, S, S, 0, 0, targetWidth, targetHeight);
        
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        if (!blob) throw new Error("Could not convert canvas to Blob for upload.");
        
        const storage = getFirebaseStorage();
        const avatarFilePath = `avatars/${currentUser.uid}/profile.jpg`;
        const fileRef = storageRef(storage, avatarFilePath);
        
        await uploadBytes(fileRef, blob);
        finalFirebasePhotoURL = await getDownloadURL(fileRef);
      
      } else if (avatarAction === 'remove') {
        finalFirebasePhotoURL = null; 
        const storage = getFirebaseStorage();
        const avatarFilePath = `avatars/${currentUser.uid}/profile.jpg`;
        const fileRef = storageRef(storage, avatarFilePath);
        try {
            await getDownloadURL(fileRef); 
            await deleteObject(fileRef);
        } catch (storageError: any) {
            if (storageError.code !== 'storage/object-not-found') {
               console.warn(`Could not delete old avatar, continuing...`, storageError);
            }
        }
      }

      const firebaseAuthUpdates: { displayName?: string; photoURL?: string | null } = {};
      let authProfileNeedsUpdate = false;

      if (formState.name !== (currentUser.displayName || "")) {
        firebaseAuthUpdates.displayName = formState.name;
        authProfileNeedsUpdate = true;
      }
      if (finalFirebasePhotoURL !== currentUser.photoURL) { 
        firebaseAuthUpdates.photoURL = finalFirebasePhotoURL;
        authProfileNeedsUpdate = true;
      }
      
      if (authProfileNeedsUpdate) {
        await updateFirebaseAuthProfile(firebaseAuthUpdates); 
      } 
      
      const serverUpdateData = { 
        idToken: idToken,
        bio: formState.bio, 
        avatarUrl: (avatarAction === 'new_upload' || avatarAction === 'remove') ? finalFirebasePhotoURL : undefined,
        displayName: formState.name,
        interests: formState.interests,
      };
      const serverUpdateResult = await updateUserProfile(currentUser.uid, serverUpdateData);

      if (!serverUpdateResult.success) {
        throw new Error(serverUpdateResult.message || "Server update failed.");
      }

      const newDisplayAvatar = serverUpdateResult.updatedContactableUser?.avatar || getDefaultVercelAvatar(currentUser.email || currentUser.uid);

      if (avatarAction === 'new_upload' && finalFirebasePhotoURL) {
        localStorage.setItem(`${USER_AVATAR_STORAGE_KEY_PREFIX}${currentUser.uid}`, finalFirebasePhotoURL);
      } else if (avatarAction === 'remove') {
        localStorage.removeItem(`${USER_AVATAR_STORAGE_KEY_PREFIX}${currentUser.uid}`);
      }
      
      dispatchStorageUpdatedEvent(); 

      setProfileData(prev => prev ? ({ 
          ...prev, 
          displayName: formState.name, 
          bio: serverUpdateResult.updatedProfile?.bio ?? formState.bio, 
          avatarUrl: newDisplayAvatar,
          interests: serverUpdateResult.updatedProfile?.interests ?? formState.interests,
        }) : null);
      setAvatarPreview(newDisplayAvatar);
      
      setSelectedAvatarFile(null);
      setAvatarAction('keep'); 
      setIsEditing(false);
      toast({ title: t.profileUpdated, description: t.profileUpdatedDesc });

    } catch (error: any) {
      let specificMessage = error.message || "Failed to update profile.";
      if (error.code === 'auth/invalid-profile-attribute') {
         specificMessage = "The avatar image format or size was not accepted by Firebase Authentication, even after processing. Please try a different image.";
      } else if (error.code === 'auth/requires-recent-login') {
         specificMessage = "This action requires you to have recently logged in. Please log out and log back in to continue.";
      } else if (error.code?.startsWith('storage/')) {
         specificMessage = `Firebase Storage error: ${error.message}. Please try again.`;
      }
      setFormError(specificMessage);
      toast({ title: t.updateFailed, description: specificMessage, variant: "destructive"});
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
        await deleteAccount();
        toast({
            title: t.deleteAccountSuccessTitle,
            description: t.deleteAccountSuccessDesc,
        });
        router.push('/');
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: t.deleteAccountFailedTitle,
            description: error.message || t.deleteAccountFailedDesc,
        });
    }
  };
  
  const handleSendFriendRequest = async () => {
    if (!currentUser || !profileData || profileData.isOwnProfile || friendshipStatus !== 'not_friends') return;

    try {
        const result = await S_sendFriendRequest(
            currentUser.uid,
            profileData.userId
        );
        if (result.success) {
            setFriendshipStatus('request_sent');
            toast({ title: t.friendRequestSentToast(profileData.displayName) });
            dispatchStorageUpdatedEvent();
        } else {
            toast({ title: "Error", description: result.message || t.friendRequestErrorToast, variant: "destructive" });
        }
    } catch (e) {
        toast({ title: "Error", description: (e as Error).message || t.friendRequestErrorToast, variant: "destructive" });
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!currentUser || !profileData || profileData.isOwnProfile || friendshipStatus !== 'request_sent') return;
    
    try {
        const result = await S_cancelSentFriendRequestByRecipient(currentUser.uid, profileData.userId);
        if (result.success) {
            setFriendshipStatus('not_friends');
            toast({ title: t.friendRequestCancelledToast });
            dispatchStorageUpdatedEvent();
        } else {
            toast({ title: "Error", description: result.message || t.friendRequestCancelErrorToast, variant: "destructive" });
        }
    } catch (e) {
         toast({ title: "Error", description: (e as Error).message || t.friendRequestCancelErrorToast, variant: "destructive" });
    }
  };

  const handleFriendRequestResponse = async (requestId: string, accepted: boolean) => {
    if (!currentUser || !authInstance) return;
    let idToken = "";
    try {
      idToken = await currentUser.getIdToken();
    } catch (tokenError) {
      toast({ title: "Error", description: t.sessionError, variant: "destructive" });
      return;
    }
    try {
      const result = await S_respondToFriendRequest(requestId, currentUser.uid, accepted); 
      if(result.success) {
        toast({ title: accepted ? t.friendRequestAcceptedToast : t.friendRequestDeclinedToast });
        fetchProfileAndFriendData(); 
        dispatchStorageUpdatedEvent();
      } else {
        toast({ title: "Error", description: result.message || t.friendRequestResponseErrorToast, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message || t.friendRequestResponseErrorToast, variant: "destructive" });
    }
  };

  const handleUnfriend = async (friendIdToUnfriend: string) => {
    if (!currentUser || !profileData || !authInstance) return;
    let idToken = "";
    try {
      idToken = await currentUser.getIdToken();
    } catch (tokenError) {
      toast({ title: "Error", description: t.sessionError, variant: "destructive" });
      return;
    }
    const userToUnfriendName = profileData.isOwnProfile
      ? currentUserFriends.find(f => f.id === friendIdToUnfriend)?.name
      : profileData.displayName;

    try {
      const result = await S_unfriend(currentUser.uid, friendIdToUnfriend); 
      if (result.success) {
        toast({ title: t.unfriendedToast, description: t.unfriendedToastDesc(userToUnfriendName!) });
        fetchProfileAndFriendData();
        dispatchStorageUpdatedEvent();
      } else {
        toast({ title: "Error", description: result.message || t.unfriendErrorToast, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message || t.unfriendErrorToast, variant: "destructive" });
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !inviteEmail.trim()) return;

    setIsSendingInvite(true);
    const result = await S_sendInvitationEmail({
        recipientEmail: inviteEmail,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "A friend",
    });

    if (result.success) {
        toast({ title: t.inviteSentTitle, description: result.message });
        setInviteEmail("");
    } else {
        toast({ title: t.inviteErrorTitle, description: result.message, variant: "destructive" });
    }
    setIsSendingInvite(false);
  };
  
  const renderFriendshipActions = () => {
    if (!currentUser || !profileData || profileData.isOwnProfile) return null;

    switch (friendshipStatus) {
        case 'loading':
            return <Button disabled><Hourglass className="mr-2 h-4 w-4 animate-spin" />{t.loading}</Button>;
        
        case 'friends':
            return (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline"><UserCheck className="mr-2 h-4 w-4" /> {t.friends}</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{t.unfriendConfirmTitle(profileData.displayName)}</AlertDialogTitle><AlertDialogDescription>{t.unfriendConfirmDesc(profileData.displayName)}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUnfriend(profileData.userId)} className="bg-destructive hover:bg-destructive/90">{t.unfriend}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );

        case 'request_sent':
            return (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline"><Send className="mr-2 h-4 w-4" /> {t.requestSent}</Button></AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{t.cancelRequestConfirmTitle}</AlertDialogTitle><AlertDialogDescription>{t.cancelRequestConfirmDesc(profileData.displayName)}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleCancelFriendRequest}>{t.yesCancel}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            );

        case 'request_received':
            const receivedReq = incomingFriendRequests.find(req => req.fromUserId === profileData.userId && req.toUserId === currentUser.uid); 
            if (!receivedReq) { 
                 return <Button onClick={handleSendFriendRequest}><UserPlus className="mr-2 h-4 w-4" /> {t.addFriend}</Button>;
            }
            return (
                <div className="flex items-center gap-2">
                    <Button onClick={() => handleFriendRequestResponse(receivedReq!.id, true)} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="mr-1.5 h-4 w-4"/>{t.accept}
                    </Button>
                    <Button variant="destructive" onClick={() => handleFriendRequestResponse(receivedReq!.id, false)}>
                        <XCircle className="mr-1.5 h-4 w-4"/>{t.decline}
                    </Button>
                </div>
            );

        case 'not_friends':
            return <Button onClick={handleSendFriendRequest}><UserPlus className="mr-2 h-4 w-4" /> {t.addFriend}</Button>;

        default:
            return null;
    }
  };


  if (isLoadingProfile || authLoading) {
    return (
      <PageShell title={t.loadingTitle} description={t.loadingDesc}>
        <Card className="shadow-xl"><CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8"><Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-full" /><div className="space-y-2 text-center md:text-left"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" /><Skeleton className="h-4 w-40" /></div></div>
            <Separator className="my-6 md:my-8" /><div className="space-y-6">{[1,2,3].map(i => (<div key={i}><Skeleton className="h-6 w-24 mb-1" /><Skeleton className="h-10 w-full" /></div>))}<Separator className="my-6 md:my-8" /><Skeleton className="h-8 w-32 mb-4" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={`group-skel-${i}`} className="h-48 w-full rounded-lg" />)}</div></div>
        </CardContent></Card>
      </PageShell>
    );
  }

  if (authErrorHook && !profileData && !currentUser && !authLoading) {
     return <PageShell title={t.authErrorTitle} description={t.authErrorDesc}><Card className="w-full max-w-md mx-auto text-center py-10 shadow-md"><CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>{t.authFailedTitle}</CardTitle><CardDescription>{t.authFailedDesc(authErrorHook)}</CardDescription></CardHeader></Card></PageShell>;
  }
  if (!profileData) {
    return <PageShell title={t.profileNotFoundTitle} description={t.profileNotFoundDesc(params.userId)}><Card className="w-full max-w-md mx-auto text-center py-10 shadow-md"><CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>{t.userNotFoundTitle}</CardTitle><CardDescription>{t.userNotFoundDesc}</CardDescription></CardHeader><CardContent><Button onClick={() => router.back()} variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>{t.goBack}</Button></CardContent></Card></PageShell>;
  }

  const pageActions = (
    <div className="flex items-center gap-2">
      {profileData.isOwnProfile && !isEditing && (
        <Button variant="outline" onClick={() => setIsEditing(true)}>
          <Edit3 className="mr-2 h-4 w-4" /> {t.editProfile}
        </Button>
      )}
      {!profileData.isOwnProfile && currentUser && (
         <>
            {renderFriendshipActions()}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setReportDialogOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        <span>{t.reportUser}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
      )}
    </div>
  );

  return (
    <PageShell
      title={profileData.isOwnProfile ? t.myProfileTitle : t.otherProfileTitle(profileData.displayName)}
      description={profileData.isOwnProfile ? t.myProfileDesc : t.otherProfileDesc(profileData.displayName)}
      actions={pageActions}
    >
      <div className="mb-6">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {t.goBack}
          </Button>
      </div>
      <Card className="shadow-xl">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="relative">
              <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-primary/50 shadow-md">
                <NextAvatarImage src={avatarPreview || profileData.avatarUrl} alt={profileData.displayName} />
                <AvatarFallback>{profileData.avatarFallback}</AvatarFallback>
              </Avatar>
              {profileData.isOwnProfile && isEditing && (
                  <div className="absolute bottom-0 right-0 flex flex-col gap-1">
                    <input 
                        type="file" 
                        accept="image/*" 
                        ref={avatarInputRef} 
                        onChange={handleAvatarChange} 
                        className="hidden" 
                        id="avatarUpload"
                    />
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-full bg-background/80 hover:bg-background" 
                        onClick={() => avatarInputRef.current?.click()}
                        aria-label={t.changeAvatar}
                        title={t.changeAvatar}
                    >
                        <Camera className="h-4 w-4"/>
                    </Button>
                    {(avatarPreview && avatarPreview !== getDefaultVercelAvatar(currentUser?.email || currentUser?.uid)) && (
                       <Button 
                        variant="destructive" 
                        size="icon" 
                        className="h-8 w-8 rounded-full" 
                        onClick={handleRemoveAvatar}
                        aria-label={t.removeAvatar}
                        title={t.removeAvatar}
                       >
                        <Trash2 className="h-4 w-4"/>
                       </Button>
                    )}
                  </div>
              )}
            </div>
            <div className="text-center md:text-left">
              <h2 className="font-headline text-2xl md:text-3xl font-bold">{profileData.displayName}</h2>
              <p className="text-muted-foreground">{profileData.email}</p>
              <p className="text-sm text-muted-foreground mt-1">Joined {profileData.joinedDate}</p>
            </div>
          </div>
          {profileData.isOwnProfile && isEditing && formError && <p className="text-sm text-destructive mt-4 text-center md:text-left">{formError}</p>}

          <Separator className="my-6 md:my-8" />
          <form onSubmit={handleSubmit} className="space-y-6">
            <div><Label htmlFor="name" className="text-base font-semibold">{t.fullNameLabel}</Label><Input id="name" value={formState.name} onChange={handleInputChange} className="mt-1 text-base" disabled={!profileData.isOwnProfile || !isEditing}/></div>
            <div><Label htmlFor="email" className="text-base font-semibold">{t.emailLabel}</Label><Input id="email" type="email" value={profileData.email} className="mt-1 text-base" disabled={true}/>{profileData.isOwnProfile && isEditing && (<p className="text-xs text-muted-foreground mt-1">{t.emailCannotChange}</p>)}</div>
            <div><Label htmlFor="bio" className="text-base font-semibold">{t.bioLabel}</Label><Textarea id="bio" value={formState.bio} onChange={handleInputChange} className="mt-1 min-h-[100px] text-base" disabled={!profileData.isOwnProfile || !isEditing} placeholder={t.bioPlaceholder}/></div>
            
            <div>
              <Label htmlFor="interests" className="text-base font-semibold">{t.interestsLabel}</Label>
              {isEditing && profileData.isOwnProfile ? (
                <>
                  <Input id="interests" value={interestInput} onChange={e => setInterestInput(e.target.value)} onKeyDown={handleInterestKeyDown} className="mt-1 text-base" placeholder={t.interestsPlaceholder}/>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formState.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary" className="text-sm py-1 pl-3 pr-1">
                            {interest}
                            <button type="button" onClick={() => handleRemoveInterest(interest)} className="ml-1.5 rounded-full p-0.5 hover:bg-destructive/20 text-destructive"><XCircle className="h-4 w-4"/></button>
                        </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profileData.interests.length > 0 ? profileData.interests.map((interest, index) => (
                    <Badge key={index} variant="secondary" className="text-sm py-1 px-3">{interest}</Badge>
                  )) : ( <p className="text-sm text-muted-foreground">{t.noInterests}</p> )}
                </div>
              )}
            </div>

            {profileData.isOwnProfile && isEditing && (<><Separator className="my-6 md:my-8" /><div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"><h3 className="font-semibold text-destructive">{t.dangerZone}</h3><p className="text-sm text-destructive/90 mt-1 mb-3">{t.dangerZoneDesc}</p><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> {t.deleteMyAccount}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle><AlertDialogDescription>{t.deleteConfirmDesc}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">{t.yesDelete}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></>)}
            {profileData.isOwnProfile && isEditing && (<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setIsEditing(false); if (currentUser) { setFormState({ name: profileData.displayName, email: profileData.email, bio: profileData.bio, interests: profileData.interests }); setAvatarPreview(profileData.avatarUrl); setSelectedAvatarFile(null); setAvatarAction('keep'); } setFormError(null); }}>{t.cancel}</Button><Button type="submit" size="lg" disabled={isSubmittingProfile}>{isSubmittingProfile ? t.saving : t.saveChanges}</Button></div>)}
          </form>
        </CardContent>
      </Card>

      {profileData.isOwnProfile && (
        <>
          <Separator className="my-8" />
          <Card className="shadow-xl mb-8">
            <CardHeader>
                <CardTitle className="font-headline">{t.friendRequestsTitle}</CardTitle>
                <CardDescription>{t.friendRequestsDesc}</CardDescription>
            </CardHeader>
            <CardContent>
                {incomingFriendRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">{t.noPendingRequests}</p>
                ) : (
                    <div className="space-y-3">
                        {incomingFriendRequests.map(req => (
                            <Card key={req.id} className="p-3 flex items-center justify-between bg-secondary/50">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <NextAvatarImage src={req.fromUserAvatar || getDefaultVercelAvatar(req.fromUserId)} />
                                        <AvatarFallback>{req.fromUserName.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{req.fromUserName}</p>
                                        <p className="text-xs text-muted-foreground">{t.wantsToBeFriend}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleFriendRequestResponse(req.id, true)}><CheckCircle className="mr-1.5 h-4 w-4"/>{t.accept}</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleFriendRequestResponse(req.id, false)}><XCircle className="mr-1.5 h-4 w-4"/>{t.decline}</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
          </Card>
          
          <Card className="shadow-xl mb-8">
              <CardHeader>
                  <CardTitle className="font-headline">{t.inviteFriendTitle}</CardTitle>
                  <CardDescription>{t.inviteFriendDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                  <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row items-start gap-2">
                      <div className="w-full space-y-1">
                          <Label htmlFor="inviteEmail" className="sr-only">{t.emailLabel}</Label>
                          <Input
                              id="inviteEmail"
                              type="email"
                              placeholder={t.invitePlaceholder}
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              disabled={isSendingInvite}
                          />
                      </div>
                      <Button type="submit" disabled={isSendingInvite || !inviteEmail.trim()} className="w-full sm:w-auto shrink-0">
                          {isSendingInvite ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.sendingInvite}</>
                          ) : (
                              <><Send className="mr-2 h-4 w-4" /> {t.sendInvite}</>
                          )}
                      </Button>
                  </form>
              </CardContent>
          </Card>


          <Card className="shadow-xl">
            <CardHeader>
                <CardTitle className="font-headline">{t.myFriendsTitle}</CardTitle>
                <CardDescription>{t.myFriendsDesc}</CardDescription>
            </CardHeader>
            <CardContent>
                {currentUserFriends.length === 0 ? (
                     <div className="text-center py-6"><Users className="mx-auto h-12 w-12 text-muted-foreground mb-3" /><p className="text-muted-foreground mb-2">{t.noFriends}</p></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {currentUserFriends.map(friend => (
                            <Card key={friend.id} className="p-3">
                                <div className="flex items-center justify-between">
                                    <Link href={`/profile/${friend.id}`} className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <NextAvatarImage src={friend.avatar || getDefaultVercelAvatar(friend.email || friend.id)}/>
                                            <AvatarFallback>{friend.name.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{friend.name}</span>
                                    </Link>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"><UserX className="h-5 w-5"/></Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>{t.unfriendConfirmTitle(friend.name)}</AlertDialogTitle><AlertDialogDescription>{t.unfriendConfirmDesc(friend.name)}</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>{t.cancel}</AlertDialogCancel><AlertDialogAction onClick={() => handleUnfriend(friend.id)} className="bg-destructive hover:bg-destructive/90">{t.unfriend}</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
          </Card>
          
          <Separator className="my-8" />
          <Card className="shadow-xl">
              <CardHeader>
                  <CardTitle className="font-headline">{t.myGroupsTitle}</CardTitle>
                  <CardDescription>{t.myGroupsDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                  {isLoadingGroups ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={`group-load-skel-${i}`} className="h-48 w-full rounded-lg" />)}</div>
                  ) : memberGroups.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {memberGroups.map(group => {
                              return (
                              <Card key={group.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-200">
                                  <div className="p-4 flex flex-col flex-grow">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Avatar className="h-10 w-10 border">
                                            <NextAvatarImage src={group.image} alt={group.name} />
                                            <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <CardTitle className="font-headline text-lg">{group.name}</CardTitle>
                                    </div>
                                    <div className="flex items-center text-xs text-muted-foreground mb-2">{group.isPublic ? <Eye className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}<span>{group.isPublic ? "Public" : "Private"}</span><span className="mx-1.5">&bull;</span><span>{group.memberIds.length} {group.memberIds.length === 1 ? "member" : "members"}</span></div><CardDescription className="text-sm mb-3 flex-grow line-clamp-2">{group.description}</CardDescription><CardFooter className="p-0 mt-auto"><Button asChild className="w-full" size="sm"><Link href={`/groups/${group.id}`}>{t.viewGroup}</Link></Button></CardFooter></div>
                              </Card>
                              );
                          })}
                      </div>
                  ) : (<div className="text-center py-6"><Users className="mx-auto h-12 w-12 text-muted-foreground mb-3" /><p className="text-muted-foreground mb-2">{t.noGroups}</p><Button variant="outline" asChild><Link href="/groups">{t.discoverGroups}</Link></Button></div>)}
              </CardContent>
          </Card>
        </>
      )}
      {!profileData.isOwnProfile && (
        <ReportDialog 
          open={reportDialogOpen} 
          onOpenChange={setReportDialogOpen}
          entityId={profileData.userId} 
          entityType="user" 
          entityLink={`/profile/${profileData.userId}`}
        >
          <></>
        </ReportDialog>
      )}
    </PageShell>
  );
}
