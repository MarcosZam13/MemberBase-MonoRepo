// community.actions.ts — Re-exporta desde core para resolver alias @/ en cross-package imports
// No se necesita "use server" aquí porque el archivo fuente en @core ya lo declara

export {
  getPosts,
  getPostById,
  createPostAction,
  toggleReaction,
  addCommentAction,
  getAdminPosts,
  togglePostVisibilityAction,
  togglePostPinnedAction,
  deleteOwnPostAction,
  deletePostAction,
  toggleCommentVisibilityAction,
  uploadPostCover,
} from "@core/actions/community.actions";
