import { useAccount } from "wagmi";
import {
  useCreateSession,
  useAbstractClient,
} from "@abstract-foundation/agw-react";
import { getStoredSession } from "../lib/session-keys/getStoredSession";
import { validateSession } from "../lib/session-keys/validateSession";
import { createAndStoreSession } from "../lib/session-keys/createAndStoreSession";
import { clearStoredSession } from "../lib/session-keys/clearStoredSession";
import { useEffect, useState, useCallback } from "react";
import chain from "@/const/chain";
/**
 * @function useAbstractSession
 * @description React hook for managing Abstract Global Wallet sessions in local storage
 *
 * This hook provides a comprehensive API for working with Abstract Global Wallet sessions.
 * It uses the connected wallet's address to manage session data specific to that wallet.
 * The hook encapsulates all the session-related functionality into a simple interface
 * that can be used throughout the application.
 *
 * The hook handles:
 * - Retrieving stored sessions from local storage
 * - Validating sessions against the on-chain session validator
 * - Creating new sessions with specific permissions
 * - Clearing session data from local storage
 *
 * All functions automatically use the connected wallet's address, so you don't need
 * to pass it explicitly when calling the returned functions.
 *
 * @returns An object containing functions for managing sessions:
 *   - getStoredSession: Retrieves and validates the stored session
 *   - validateSession: Validates a specific session hash
 *   - createAndStoreSession: Creates a new session and stores it
 *   - clearStoredSession: Clears session data from local storage
 *
 * If no wallet is connected, all functions will return null.
 */
export const useAbstractSession = () => {
  const [hasValidSession, setHasValidSession] = useState<boolean>(false);
  const { address } = useAccount();
  const { createSessionAsync } = useCreateSession();
  const { data: client } = useAbstractClient();

  // Check session status helper function
  const checkSession = useCallback(async () => {
    if (address && client) {
      const session = await getStoredSession(
        client,
        address,
        chain,
        createSessionAsync
      );
      if (session) {
        setHasValidSession(true);
        return true;
      } else {
        setHasValidSession(false);
        return false;
      }
    } else {
      setHasValidSession(false);
      return false;
    }
  }, [address, client, chain, createSessionAsync]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Modified createAndStoreSession that updates hasValidSession
  const createAndStoreSessionWithUpdate = useCallback(async () => {
    if (!address || !createSessionAsync) return null;

    try {
      const result = await createAndStoreSession(address, createSessionAsync);
      if (result) {
        setHasValidSession(true);
      }
      return result;
    } catch (error) {
      console.error("Error creating session:", error);
      return null;
    }
  }, [address, createSessionAsync]);

  // Modified clearStoredSession that updates hasValidSession
  const clearStoredSessionWithUpdate = useCallback(() => {
    if (!address) return null;

    clearStoredSession(address);
    setHasValidSession(false);
    return true;
  }, [address]);

  if (!address || !client)
    return {
      hasValidSession: false,
      getStoredSession: () => null,
      validateSession: () => null,
      createAndStoreSession: () => null,
      clearStoredSession: () => null,
    };

  return {
    hasValidSession,
    getStoredSession: () =>
      getStoredSession(client, address, chain, createSessionAsync),
    validateSession: (sessionHash: `0x${string}`) =>
      validateSession(client, address, sessionHash, chain, createSessionAsync),
    createAndStoreSession: createAndStoreSessionWithUpdate,
    clearStoredSession: clearStoredSessionWithUpdate,
  };
};
