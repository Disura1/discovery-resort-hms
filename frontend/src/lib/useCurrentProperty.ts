import { useQuery } from "@tanstack/react-query";
import { propertiesApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";

/**
 * Front Desk/Manager/Housekeeping/Accountant staff are scoped to a single
 * property. An Owner may manage several, so this hook falls back to their
 * first property until a full property-switcher is added.
 */
export function useCurrentProperty() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: () => propertiesApi.list().then((r) => r.data.properties),
    enabled: !!user
  });

  if (user?.propertyId) {
    const property = data?.find((p) => p.id === user.propertyId);
    return { propertyId: user.propertyId, property, isLoading };
  }

  return { propertyId: data?.[0]?.id, property: data?.[0], isLoading };
}
