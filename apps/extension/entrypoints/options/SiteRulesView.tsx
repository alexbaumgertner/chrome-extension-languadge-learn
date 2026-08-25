import { useEffect, useState } from "react";
import type { GetSiteRulesResponse, SetSiteStatusResponse, SiteRule } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";

export default function SiteRulesView() {
  const [siteRules, setSiteRules] = useState<Record<string, SiteRule> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load(): void {
    void sendMessage<GetSiteRulesResponse>({ type: "GET_SITE_RULES" }).then((res) =>
      setSiteRules(res.siteRules),
    );
  }

  useEffect(load, []);

  async function toggle(hostname: string, currentStatus: SiteRule["status"]): Promise<void> {
    const nextStatus = currentStatus === "enabled" ? "disabled" : "enabled";
    const res = await sendMessage<SetSiteStatusResponse>({
      type: "SET_SITE_STATUS",
      hostname,
      status: nextStatus,
    });
    if (res.ok) {
      setError(null);
      load();
    } else {
      setError(`Permission was declined for ${hostname}.`);
    }
  }

  if (!siteRules) return <p>Loading…</p>;

  const entries = Object.values(siteRules);

  return (
    <section>
      <h1>Site Rules</h1>
      {error && <p style={{ color: "#b71c1c", fontSize: 12 }}>{error}</p>}
      {entries.length === 0 ? (
        <p>No sites enabled yet — use the popup on a site you're reading to turn it on.</p>
      ) : (
        <table>
          <tbody>
            {entries.map((rule) => (
              <tr key={rule.hostname}>
                <td>{rule.hostname}</td>
                <td>{rule.status}</td>
                <td>
                  <button
                    className="action"
                    onClick={() => void toggle(rule.hostname, rule.status)}
                  >
                    {rule.status === "enabled" ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
