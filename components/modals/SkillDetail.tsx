"use client";

import type { Skill } from "./skills-config-types";
import { sourceLabel, shortenPath } from "./skills-config-types";
import styles from "./SkillDetail.module.css";

export function Toggle({
  enabled,
  loading,
  onToggle,
}: {
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  const toggleClass = loading
    ? (enabled ? styles.toggleLoading : styles.toggleLoadingDisabled)
    : (enabled ? styles.toggleEnabled : styles.toggleDisabled);

  return (
    <button
      onClick={onToggle}
      disabled={loading}
      title={
        enabled
          ? "Visible in model prompt — click to disable"
          : "Hidden from model prompt — click to enable"
      }
      className={`${styles.toggle} ${toggleClass}`}
    >
      <span
        className={`${styles.toggleKnob} ${enabled ? styles.toggleKnobOn : styles.toggleKnobOff}`}
      />
    </button>
  );
}

export function SkillDetail({
  skill,
  cwd,
  onToggle,
  toggling,
  saveError,
}: {
  skill: Skill;
  cwd: string;
  onToggle: (skill: Skill) => void;
  toggling: boolean;
  saveError: string | null;
}) {
  const label = sourceLabel(skill);
  const enabled = !skill.disableModelInvocation;

  function displayPath(p: string): string {
    if (label === "project" && p.startsWith(cwd)) {
      const rel = p.slice(cwd.length).replace(/^[/\\]/, "");
      return `./${rel}`;
    }
    return shortenPath(p);
  }

  return (
    <div className={styles.container}>
      {/* Path + tag + toggle */}
      <div className={styles.pathRow}>
        <span
          className={`${styles.tag} ${label === "project" ? styles.tagProject : styles.tagGlobal}`}
        >
          {label}
        </span>
        <span className={styles.pathText}>
          {displayPath(skill.filePath)}
        </span>
        <Toggle
          enabled={enabled}
          loading={toggling}
          onToggle={() => onToggle(skill)}
        />
        {saveError && (
          <span className={styles.errorText}>
            {saveError}
          </span>
        )}
      </div>

      <div className={styles.fieldSection}>
        <span className={styles.fieldLabel}>
          Name
        </span>
        <span className={styles.fieldValueMono}>
          {skill.name}
        </span>
      </div>

      <div className={styles.fieldSection}>
        <span className={styles.fieldLabel}>
          Description
        </span>
        <span className={styles.fieldValueText}>
          {skill.description}
        </span>
      </div>
    </div>
  );
}
