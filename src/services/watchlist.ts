import {
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { 
  watchlistsRef, 
  watchlistItemsRef, 
  usersRef, 
  pendingInvitesRef,
  DBWatchlist, 
  DBWatchlistItem,
  DBUser,
  DBPendingInvite,
  auth
} from './firebase';
import { MediaItem } from '../store/slices/mediaSlice';
import { store } from '../store/store';
import { SerializedWatchlistItem } from '../store/slices/watchlistSlice';

// Create a new watchlist
export const createWatchlist = async (name: string, creatorId: string) => {
  try {
    console.log('Starting watchlist creation process:', { name, creatorId });
    
    // Validate inputs
    if (!name.trim()) throw new Error('Watchlist name cannot be empty');
    if (!creatorId.trim()) throw new Error('Creator ID cannot be empty');
    console.log('Input validation passed');

    // Create user reference
    console.log('Creating user reference for:', creatorId);
    const userRef = doc(usersRef, creatorId);
    console.log('User reference created, attempting to verify user exists...');

    try {
      const userDoc = await getDoc(userRef);
      console.log('User document fetch completed:', {
        exists: userDoc.exists(),
        id: userDoc.id,
        path: userDoc.ref.path
      });
      
      if (!userDoc.exists()) {
        console.error('User document not found:', {
          userId: creatorId,
          docPath: userDoc.ref.path
        });
        throw new Error('Creator user not found');
      }
      
      const userData = userDoc.data();
      console.log('User data retrieved:', {
        hasEmail: !!userData?.email,
        hasDisplayName: !!userData?.displayName,
        hasActiveWatchlist: !!userData?.activeWatchlist
      });
    } catch (error: any) {
      console.error('Error fetching user document:', {
        userId: creatorId,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
      throw new Error(`Failed to verify user: ${error.message}`);
    }

    // Create the watchlist
    const watchlistData: Omit<DBWatchlist, 'id'> = {
      name,
      users: [creatorId],
      currentTvShow: null,
      currentMovie: null,
      lastTvShowAddedBy: null,
      lastMovieAddedBy: null,
      lastAddedBy: null,
      createdAt: serverTimestamp() as Timestamp,
    };
    console.log('Watchlist data prepared:', watchlistData);

    console.log('Attempting to create watchlist document...');
    const watchlistRef = await addDoc(watchlistsRef, watchlistData);
    console.log('Watchlist created successfully:', watchlistRef.id);

    // Update the creator's active watchlist and set isWatchlistCreator flag
    console.log('Attempting to update user document with new watchlist...');
    await updateDoc(userRef, {
      activeWatchlist: watchlistRef.id,
      isWatchlistCreator: true,
    });
    console.log('User document updated successfully');

    return watchlistRef.id;
  } catch (error: any) {
    console.error('Detailed error in createWatchlist:', {
      error,
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      location: error.location,
      details: error.details
    });
    throw new Error(`Failed to create watchlist: ${error.message}`);
  }
};

// Invite a user to a watchlist
export const inviteToWatchlist = async (email: string, watchlistId: string) => {
  try {
    // First check if the watchlist exists
    const watchlistRef = doc(watchlistsRef, watchlistId);
    const watchlistDoc = await getDoc(watchlistRef);
    
    if (!watchlistDoc.exists()) {
      throw new Error('Watchlist not found');
    }

    const watchlistData = watchlistDoc.data() as DBWatchlist;
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('You must be signed in to invite users');
    }

    // Try to find if user already exists
    const usersQuery = query(usersRef, where('email', '==', email.toLowerCase()));
    const userSnapshot = await getDocs(usersQuery);

    if (!userSnapshot.empty) {
      // User exists, add to their watchlistInvites
      const invitedUser = userSnapshot.docs[0];
      const userData = invitedUser.data();
      const currentInvites = Array.isArray(userData.watchlistInvites) ? userData.watchlistInvites : [];
      
      if (currentInvites.includes(watchlistId)) {
        throw new Error('User has already been invited to this watchlist');
      }

      await updateDoc(doc(usersRef, invitedUser.id), {
        watchlistInvites: [...currentInvites, watchlistId]
      });
    } else {
      // User doesn't exist, create a pending invite
      const pendingInviteData: Omit<DBPendingInvite, 'id'> = {
        email: email.toLowerCase(),
        watchlistId,
        watchlistName: watchlistData.name,
        invitedBy: currentUser.uid,
        invitedByName: currentUser.displayName || 'A user',
        createdAt: serverTimestamp() as Timestamp
      };

      // Check if there's already a pending invite
      const pendingQuery = query(
        pendingInvitesRef, 
        where('email', '==', email.toLowerCase()),
        where('watchlistId', '==', watchlistId)
      );
      const pendingSnapshot = await getDocs(pendingQuery);

      if (!pendingSnapshot.empty) {
        throw new Error('An invite has already been sent to this email');
      }

      await addDoc(pendingInvitesRef, pendingInviteData);

      // TODO: Send email invitation
      // For now, we'll just log that we would send an email
      console.log('Would send email to:', email, 'for watchlist:', watchlistData.name);
    }
  } catch (error) {
    console.error('Error inviting user:', error);
    throw error;
  }
};

// Accept a watchlist invitation
export const acceptInvitation = async (userId: string, watchlistId: string, inviteId?: string): Promise<string> => {
  try {
    console.log('Starting invitation acceptance process...', { userId, watchlistId, inviteId });
    
    // Get current Firebase user
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error('User must be signed in and have an email to accept invitations');
    }

    // First verify the invite exists and is valid
    if (!inviteId) {
      throw new Error('Invite ID is required');
    }

    console.log('Verifying invite...', inviteId);
    const inviteRef = doc(pendingInvitesRef, inviteId);
    const inviteDoc = await getDoc(inviteRef);
    
    if (!inviteDoc.exists()) {
      throw new Error('Invite not found or already accepted');
    }

    const inviteData = inviteDoc.data();
    console.log('Found invite data:', inviteData);
    
    if (inviteData.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      throw new Error('This invite is for a different email address');
    }

    if (inviteData.watchlistId !== watchlistId) {
      throw new Error('Invite is for a different watchlist');
    }

    // Get watchlist data
    console.log('Getting watchlist data...');
    const watchlistRef = doc(watchlistsRef, watchlistId);
    const watchlistDoc = await getDoc(watchlistRef);

    if (!watchlistDoc.exists()) {
      throw new Error('Watchlist not found');
    }

    const watchlist = watchlistDoc.data() as DBWatchlist;
    console.log('Found watchlist:', watchlist.name);

    // Add user to watchlist - only update the users array
    console.log('Adding user to watchlist users array...');
    const updatedUsers = [...watchlist.users];
    if (!updatedUsers.includes(userId)) {
      updatedUsers.push(userId);
      await updateDoc(watchlistRef, {
        users: updatedUsers
      });
    }

    // Delete the invite
    console.log('Deleting invite document...');
    await deleteDoc(inviteRef);

    // Update user's active watchlist
    console.log('Getting user data...');
    const userRef = doc(usersRef, userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data() as DBUser;
    
    if (!userData) {
      throw new Error('User data not found');
    }

    console.log('Updating user document...');
    await updateDoc(userRef, {
      activeWatchlist: watchlistId,
      watchlistInvites: userData.watchlistInvites.filter((id: string) => id !== watchlistId),
    });

    console.log('Invitation acceptance completed successfully');
    return watchlistId;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

// Subscribe to watchlist changes
export const subscribeToWatchlist = (watchlistId: string, callback: (data: DBWatchlist) => void) => {
  const watchlistRef = doc(watchlistsRef, watchlistId);
  
  return onSnapshot(watchlistRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        ...data,
        id: doc.id,
      } as DBWatchlist);
    }
  });
};

// Subscribe to watchlist items
export const subscribeToWatchlistItems = (watchlistId: string, callback: (items: SerializedWatchlistItem[]) => void) => {
  // Validate watchlistId
  if (!watchlistId) {
    console.error('Invalid watchlistId provided to subscribeToWatchlistItems');
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }

  console.log('Setting up watchlist items subscription for:', watchlistId);
  const itemsQuery = query(
    watchlistItemsRef, 
    where('watchlistId', '==', watchlistId)
  );
  
  return onSnapshot(itemsQuery, (snapshot) => {
    console.log('Watchlist items snapshot received, docs:', snapshot.docs.length);
    if (snapshot.docs.length > 0) {
      console.log('First doc data:', snapshot.docs[0].data());
    }
    const items = snapshot.docs
      .map(doc => {
        const data = doc.data();
        // Convert to SerializedWatchlistItem with proper timestamp handling
        const serializedItem: SerializedWatchlistItem = {
          id: doc.id,
          watchlistId: data.watchlistId,
          title: data.title,
          posterPath: data.posterPath,
          overview: data.overview,
          type: data.type,
          addedBy: data.addedBy,
          addedAt: data.addedAt && typeof data.addedAt.toMillis === 'function' 
            ? data.addedAt.toMillis() 
            : data.addedAt || Date.now(),
        };

        // Add optional fields if they exist
        if (data.rating !== undefined) serializedItem.rating = data.rating;
        if (data.comment !== undefined) serializedItem.comment = data.comment;
        if (data.finishedAt) {
          serializedItem.finishedAt = typeof data.finishedAt.toMillis === 'function'
            ? data.finishedAt.toMillis()
            : data.finishedAt;
        }

        return serializedItem;
      })
      .filter(item => !item.finishedAt); // Filter out items that have a finishedAt timestamp
    
    console.log('Processed watchlist items:', items);
    callback(items);
  }, (error) => {
    console.error('Error in watchlist items subscription:', error);
    callback([]);
  });
};

// Subscribe to finished items
export const subscribeToFinishedItems = (watchlistId: string, callback: (items: SerializedWatchlistItem[]) => void) => {
  if (!watchlistId) {
    console.error('Invalid watchlistId provided to subscribeToFinishedItems');
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }

  console.log('Setting up finished items subscription for:', watchlistId);
  const itemsQuery = query(
    watchlistItemsRef, 
    where('watchlistId', '==', watchlistId),
    where('finishedAt', '!=', null) // Only get finished items
  );
  
  return onSnapshot(itemsQuery, (snapshot) => {
    console.log('Finished items snapshot received, docs:', snapshot.docs.length);
    const items = snapshot.docs.map(doc => {
      const data = doc.data();
      // Convert to SerializedWatchlistItem with proper timestamp handling
      const serializedItem: SerializedWatchlistItem = {
        id: doc.id,
        watchlistId: data.watchlistId,
        title: data.title,
        posterPath: data.posterPath,
        overview: data.overview,
        type: data.type,
        addedBy: data.addedBy,
        addedAt: data.addedAt && typeof data.addedAt.toMillis === 'function' 
          ? data.addedAt.toMillis() 
          : data.addedAt || Date.now(),
      };

      // Add optional fields if they exist
      if (data.rating !== undefined) serializedItem.rating = data.rating;
      if (data.comment !== undefined) serializedItem.comment = data.comment;
      if (data.finishedAt) {
        serializedItem.finishedAt = typeof data.finishedAt.toMillis === 'function'
          ? data.finishedAt.toMillis()
          : data.finishedAt;
      }

      return serializedItem;
    });
    console.log('Processed finished items:', items.length);
    callback(items);
  }, (error) => {
    console.error('Error in finished items subscription:', error);
    callback([]);
  });
};

// Add item to watchlist
export const addItemToWatchlist = async (watchlistId: string, item: MediaItem) => {
  try {
    if (!watchlistId) {
      throw new Error('watchlistId is required');
    }

    // Get current watchlist state to check turns
    const watchlistRef = doc(watchlistsRef, watchlistId);
    const watchlistDoc = await getDoc(watchlistRef);
    if (!watchlistDoc.exists()) {
      throw new Error('Watchlist not found');
    }

    const watchlist = watchlistDoc.data() as DBWatchlist;
    const lastAddedBy = item.type === 'movie' ? watchlist.lastMovieAddedBy : watchlist.lastTvShowAddedBy;

    // Check if it's the user's turn
    if (lastAddedBy === item.addedBy) {
      throw new Error(`It's not your turn to add a ${item.type}. Let your partner choose next!`);
    }

    // Create watchlist item data, omitting undefined values
    const watchlistItemData: Omit<DBWatchlistItem, 'id'> = {
      watchlistId: watchlistId,
      title: item.title,
      posterPath: item.posterPath,
      overview: item.overview,
      type: item.type,
      addedBy: item.addedBy,
      addedAt: serverTimestamp() as Timestamp,
    };

    // Only add optional fields if they are defined
    if (item.rating !== undefined) {
      watchlistItemData.rating = item.rating;
    }
    if (item.comment !== undefined) {
      watchlistItemData.comment = item.comment;
    }

    console.log('Adding item to watchlist:', { watchlistId, watchlistItemData });
    await addDoc(watchlistItemsRef, watchlistItemData);

    // Update lastAddedBy in watchlist
    await updateDoc(watchlistRef, {
      lastAddedBy: item.addedBy,
      ...(item.type === 'movie' 
        ? { lastMovieAddedBy: item.addedBy }
        : { lastTvShowAddedBy: item.addedBy }
      ),
    });
  } catch (error) {
    console.error('Error adding item to watchlist:', error);
    throw error;
  }
};

// Remove item from watchlist
export const removeItemFromWatchlist = async (itemId: string) => {
  try {
    // First get the item to know its watchlist
    const itemRef = doc(watchlistItemsRef, itemId);
    const itemDoc = await getDoc(itemRef);
    if (!itemDoc.exists()) {
      throw new Error('Item not found');
    }

    const item = itemDoc.data() as DBWatchlistItem;
    const watchlistId = item.watchlistId;

    // Get all items in the watchlist
    const itemsQuery = query(watchlistItemsRef, where('watchlistId', '==', watchlistId));
    const itemsSnapshot = await getDocs(itemsQuery);
    
    // If this is the last item, reset the turn state
    if (itemsSnapshot.size <= 1) {
      const watchlistRef = doc(watchlistsRef, watchlistId);
      await updateDoc(watchlistRef, {
        lastAddedBy: null,
        lastMovieAddedBy: null,
        lastTvShowAddedBy: null
      });
    }

    // Remove the item
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('Error removing item from watchlist:', error);
    throw error;
  }
};

// Update currently watching
export const updateCurrentlyWatching = async (watchlistId: string, item: MediaItem | null, mediaType: 'movie' | 'tv') => {
  try {
    const watchlistRef = doc(watchlistsRef, watchlistId);
    
    // Get current watchlist state
    const watchlistDoc = await getDoc(watchlistRef);
    if (!watchlistDoc.exists()) {
      throw new Error('Watchlist not found');
    }

    const watchlist = watchlistDoc.data() as DBWatchlist;
    
    // Only check if something is playing when we're trying to add a new item
    if (item !== null) {
      const currentlyPlaying = mediaType === 'movie' ? watchlist.currentMovie : watchlist.currentTvShow;
      if (currentlyPlaying && currentlyPlaying.id) {
        throw new Error(`A ${mediaType} is already playing`);
      }
    }

    // Update the watchlist with the new item
    if (mediaType === 'movie') {
      await updateDoc(watchlistRef, {
        currentMovie: item,
        lastMovieAddedBy: item ? item.addedBy : null,
      });
    } else {
      await updateDoc(watchlistRef, {
        currentTvShow: item,
        lastTvShowAddedBy: item ? item.addedBy : null,
      });
    }
  } catch (error) {
    console.error('Error updating currently watching:', error);
    throw error;
  }
};

// Mark item as finished
export const markAsFinished = async (watchlistId: string, mediaType: 'movie' | 'tv') => {
  try {
    const watchlistRef = doc(watchlistsRef, watchlistId);
    const watchlistDoc = await getDoc(watchlistRef);
    
    if (!watchlistDoc.exists()) {
      throw new Error('Watchlist not found');
    }

    const watchlist = watchlistDoc.data() as DBWatchlist;
    const currentItem = mediaType === 'movie' ? watchlist.currentMovie : watchlist.currentTvShow;

    if (!currentItem) {
      throw new Error('No item currently playing');
    }

    // Find the original watchlist item
    const itemsQuery = query(
      watchlistItemsRef,
      where('watchlistId', '==', watchlistId),
      where('title', '==', currentItem.title),
      where('type', '==', mediaType),
      where('finishedAt', '==', null)
    );
    
    const itemSnapshot = await getDocs(itemsQuery);
    if (itemSnapshot.empty) {
      throw new Error('Original watchlist item not found');
    }

    // Update the original item with finishedAt timestamp
    const itemDoc = itemSnapshot.docs[0];
    await updateDoc(itemDoc.ref, {
      finishedAt: serverTimestamp()
    });

    // Clear the current item from the watchlist
    await updateCurrentlyWatching(watchlistId, null, mediaType);
  } catch (error) {
    console.error('Error marking item as finished:', error);
    throw error;
  }
}; 