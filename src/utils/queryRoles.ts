import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

export const getRoles = async (
  connection: SupabaseClient,
  userId: string
): Promise<string[] | undefined> => {
  try {
    const roleQueryResponse = await connection
      .from("users_roles")
      .select("roles(name)")
      .eq("user_id", userId);

    if (roleQueryResponse.error) {
      const errorMsg = "Error consultando roles";
      console.error(errorMsg, roleQueryResponse.error);
      const customError = {
        ...roleQueryResponse.error,
        code: 500,
        message: errorMsg,
      };
      throw customError;
    }

    //@ts-ignore
    const roles = roleQueryResponse.data.map((item) => item.roles.name);

    return roles;
  } catch (e: any) {
    const customError = {
      ...e,
      status: 500,
      message: "Error consultando roles",
    };
  }
};
