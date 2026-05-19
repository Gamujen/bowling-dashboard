import { useMatches } from "../hooks/useMatches";
import { useBowlers } from "../hooks/useBowlers";
import { useSubmissions } from "../hooks/useSubmissions";
import { useState } from "react";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAlerts } from "../hooks/useAlerts";
import { motion } from "framer-motion";


export default function FrontDeskDashboard() {
  const matches = useMatches();
  const bowlers = useBowlers();
  const submissions = useSubmissions();
  const alerts = useAlerts();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertType, setAlertType] = useState("Ball Return");
  const [alertLane, setAlertLane] = useState("");
  const [alertLanePair, setAlertLanePair] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertMode, setAlertMode] = useState("Call2Back");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [adminAlert, setAdminAlert] = useState(null);

  // Group matches by game
  const groupedMatches = { 1: [], 2: [], 3: [] };

  matches.forEach((m) => {
    if (groupedMatches[m.gameNumber]) {
      groupedMatches[m.gameNumber].push(m);
    }
  });

  // Sort by lane
  Object.values(groupedMatches).forEach((group) => {
    group.sort((a, b) => {
      return (a.lanePair?.[0] || 0) - (b.lanePair?.[0] || 0);
    });
  });

  // Determine match state
  function getMatchState(matchId) {
    const match = matches.find((m) => m.id === matchId);

    if (match?.status === "confirmed") return "confirmed";

    const matchSubs = submissions.filter((s) => s.matchId === matchId);

    if (matchSubs.length === 0) return "pending";
    if (matchSubs.length === 1) return "in_progress";

    const first = matchSubs[0];

    const allSame = matchSubs.every(
      (s) =>
        s.scoreA === first.scoreA &&
        s.scoreB === first.scoreB
    );

    return allSame ? "confirmed" : "conflict";
  }

  // Confirm match
  async function confirmMatch() {
    if (!selectedMatch || !selectedSubmissionId) return;

    const selectedSubmission = submissions.find(
      (s) => s.id === selectedSubmissionId
    );

    if (!selectedSubmission) return;

    try {
      await updateDoc(doc(db, "matches", selectedMatch.id), {
        finalScoreA: selectedSubmission.scoreA,
        finalScoreB: selectedSubmission.scoreB,
        status: "confirmed",
        confirmedAt: new Date(),
      });

      setSelectedMatch(null);
      setSelectedSubmissionId(null);
    } catch (err) {
      console.error("Error confirming match:", err);
    }
  }

  function calculateHandicap(average) {
    return Math.max(200 - average, 0);
  }

  function getAdjustedScore(score, average) {
    const handicap = calculateHandicap(average);
    return score + handicap;
  }

  function calculateStandings(division) {
    // Get bowlers in division
    const divisionBowlers = Object.values(bowlers).filter(
      (b) => b.division === division
    );

    // Build standings
    const standings = divisionBowlers.map((bowler) => {
      let totalPins = 0;
      let points = 0;
      let wins = 0;
      let losses = 0;
      let ties = 0;

      matches.forEach((match) => {
        if (match.status !== "confirmed") return;

        const bowlerA = bowlers[match.bowlerAId];
        const bowlerB = bowlers[match.bowlerBId];

        if (!bowlerA || !bowlerB) return;

        const adjustedA = getAdjustedScore(
          match.finalScoreA || 0,
          bowlerA.average || 0
        );

        const adjustedB = getAdjustedScore(
          match.finalScoreB || 0,
          bowlerB.average || 0
        );

        // Add total pins
        if (match.bowlerAId === bowler.id) {
          totalPins += adjustedA;

          if (adjustedA > adjustedB) {
            points += 1;
            wins += 1;
          } else if (adjustedA < adjustedB) {
            losses += 1;
          } else {
            points += 0.5;
            ties += 1;
          }
        }

        if (match.bowlerBId === bowler.id) {
          totalPins += adjustedB;

          if (adjustedB > adjustedA) {
            points += 1;
            wins += 1;
          } else if (adjustedB < adjustedA) {
            losses += 1;
          } else {
            points += 0.5;
            ties += 1;
          }
        }
      });

      return {
        ...bowler,
        totalPins,
        points,
        wins,
        losses,
        ties,
      };
    });

    // Sort descending

    // Sort descending
    standings.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      return b.totalPins - a.totalPins;
    });

    return standings;
  }

  async function createAlert() {
    try {
      await addDoc(collection(db, "alerts"), {
        type: alertType,
        lane: Number(alertLane),

        lanePair: alertLanePair
          ? alertLanePair
              .split(",")
              .map((n) => Number(n.trim()))
          : null,

        message: alertMessage,
        mode: alertMode,
        status: "active",
        createdAt: serverTimestamp(),
      });

      // Reset form
      setShowAlertModal(false);

      setAlertType("Ball Return");
      setAlertLane("");
      setAlertLanePair("");
      setAlertMessage("");
      setAlertMode("Call2Back");

    } catch (err) {
      console.error("Error creating alert:", err);
    }
  }

  async function updateAlertStatus(alertId, status) {
    try {
      await updateDoc(doc(db, "alerts", alertId), {
        status,
        updatedAt: serverTimestamp(),
      });

      setSelectedAlert(null);

    } catch (err) {
      console.error("Error updating alert:", err);
    }
  }

  return (
    <>
      <div className="dashboard">
        <h2>Front Desk Dashboard</h2>

        <div className="columns">
          {/* LEFT COLUMN */}
          <div className="column left">
            <h3>Match Validation</h3>

            {[1, 2, 3].map((game) => (
              <div key={game} className="game-section">
                <h4>Game {game}</h4>

                {groupedMatches[game].map((m) => (
                  <div
                    key={m.id}
                    className={`match-card ${getMatchState(m.id)}`}
                    onClick={() => {
                      setSelectedMatch(m);
                      setSelectedSubmissionId(null);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div>
                      <strong>
                        Lane {m.lanePair?.[0]} - {m.lanePair?.[1]}
                      </strong>
                    </div>

                    <div>
                      {bowlers[m.bowlerAId]?.name || "Loading"}{" "}
                      {m.finalScoreA ?? "-"} vs{" "}
                      {bowlers[m.bowlerBId]?.name || "Loading"}{" "}
                      {m.finalScoreB ?? "-"}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* MIDDLE COLUMN */}
          <div className="column middle">
            <h3>Standings</h3>

            {["Rising Stars", "Junior Pros"].map((division) => {
              const standings = calculateStandings(division);

              return (
                <div key={division} className="division-section">
                  <h4>{division}</h4>

                  {standings.slice(0, 3).map((bowler, index) => (
                    <div key={bowler.id} className="standing-row">
                      <strong>#{index + 1}</strong>{" "}
                      <div>
                        {bowler.name}
                      </div>

                      <div>
                        {bowler.points} pts
                      </div>

                      <div>
                        {bowler.totalPins} pins
                      </div>

                      <div style={{ fontSize: "12px", opacity: 0.7 }}>
                        {bowler.wins}-{bowler.losses}-{bowler.ties}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN */}
          <div className="column right">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3>Alerts</h3>

              <button onClick={() => setShowAlertModal(true)}>
                +
              </button>
            </div>

            {alerts
              .filter(
                (alert) =>
                  alert.status !== "resolved" &&
                  alert.status !== "cancelled"
              )
              .map((alert) => (
                <motion.div
                  key={alert.id}
                  className="alert-swipe-wrapper"
                >
                  {/* background actions */}
                  <div className="alert-swipe-actions">
                    <div className="swipe-left-action">
                      {alert.status === "active"
                        ? "ACK"
                        : alert.status === "acknowledged"
                          ? "RES"
                          : ""}
                    </div>

                    <div className="swipe-right-action">
                      DEL
                    </div>
                  </div>

                  {/* draggable card */}
                  <motion.div
                    className={`alert-card condensed ${alert.status}`}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    whileTap={{ scale: 0.98 }}
                    onDragEnd={(e, info) => {
                      const x = info.offset.x;

                      // LEFT SWIPE LOGIC (status progression)
                      if (x < -120) {
                        if (alert.status === "active") {
                          updateAlertStatus(alert.id, "acknowledged");
                        } else if (alert.status === "acknowledged") {
                          updateAlertStatus(alert.id, "resolved");
                        }
                      }

                      // RIGHT SWIPE LOGIC (delete flow)
                      if (x > 120) {
                        const confirmDelete = window.confirm(
                          "Delete this alert?"
                        );

                        if (confirmDelete) {
                          updateAlertStatus(alert.id, "cancelled");
                        }
                      }
                    }}
                    onClick={() =>
                      setSelectedAlert(
                        selectedAlert?.id === alert.id ? null : alert
                      )
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setAdminAlert(alert);
                    }}
                    style={{
                      position: "relative",
                      zIndex: 2,
                      touchAction: "pan-y"
                    }}
                  >
                    {/* Compact Row */}
                    <div className="alert-row">
                      <div className="alert-type">{alert.type}</div>

                      <div className="alert-lane">
                        Lane {alert.lane}
                      </div>

                      <div className="alert-mode">{alert.mode}</div>
                    </div>

                    {/* Expanded */}
                    {selectedAlert?.id === alert.id && (
                      <div className="alert-expanded">
                        {alert.lanePair && (
                          <div>
                            Pair: {alert.lanePair.join(" - ")}
                          </div>
                        )}

                        <div>Status: {alert.status}</div>

                        <div className="alert-message-box">
                          {alert.message || "No message"}
                        </div>

                        <div className="alert-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAlertStatus(
                                alert.id,
                                "acknowledged"
                              );
                            }}
                          >
                            Ack
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAlertStatus(alert.id, "resolved");
                            }}
                          >
                            Resolve
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAlertStatus(alert.id, "cancelled");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              ))}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {selectedMatch && (
        <>
          <div
            className="modal-overlay"
            onClick={() => {
              setSelectedMatch(null);
              setSelectedSubmissionId(null);
            }}
          />

          <div className="match-detail">
            <h3>Match Detail</h3>

            <div>
              <strong>
                Lane {selectedMatch.lanePair?.[0]} -{" "}
                {selectedMatch.lanePair?.[1]}
              </strong>
            </div>

            <div>
              {bowlers[selectedMatch.bowlerAId]?.name} vs{" "}
              {bowlers[selectedMatch.bowlerBId]?.name}
            </div>

            <hr />

            <h4>Submissions</h4>

            {submissions
              .filter((s) => s.matchId === selectedMatch.id)
              .map((s) => (
                <div
                  key={s.id}
                  className={`submission-row ${
                    selectedSubmissionId === s.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedSubmissionId(s.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div>
                    {bowlers[selectedMatch.bowlerAId]?.name} {s.scoreA} vs{" "}
                    {bowlers[selectedMatch.bowlerBId]?.name} {s.scoreB}
                  </div>

                  <div>{s.submittedBy}</div>
                </div>
              ))}

            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => {
                  setSelectedMatch(null);
                  setSelectedSubmissionId(null);
                }}
              >
                Close
              </button>

              <button
                onClick={confirmMatch}
                disabled={!selectedSubmissionId}
                style={{ marginLeft: 10 }}
              >
                Confirm Match
              </button>

              {!selectedSubmissionId && (
                <p style={{ color: "orange", marginTop: 8 }}>
                  Select a submission to confirm
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {showAlertModal && (
          <>
            <div
              className="modal-overlay"
              onClick={() => setShowAlertModal(false)}
            />

            <div className="alert-modal">
              <h3>Create Alert</h3>

              <div className="form-group">
                <label>Type</label>

                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                >
                  <option>Ball Return</option>
                  <option>Deadwood</option>
                  <option>Reset Lanes</option>
                  <option>Spot Pins</option>
                  <option>Score Correction</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Lane</label>

                <input
                  value={alertLane}
                  onChange={(e) => setAlertLane(e.target.value)}
                  placeholder="12"
                />
              </div>

              <div className="form-group">
                <label>Lane Pair</label>

                <input
                  value={alertLanePair}
                  onChange={(e) => setAlertLanePair(e.target.value)}
                  placeholder="12,13"
                />
              </div>

              <div className="form-group">
                <label>Message</label>

                <input
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="Describe issue"
                />
              </div>

              <div className="form-group">
                <label>Mode</label>

                <select
                  value={alertMode}
                  onChange={(e) => setAlertMode(e.target.value)}
                >
                  <option>Call2Back</option>
                  <option>FrontDeskFix</option>
                </select>
              </div>

              <div style={{ marginTop: 16 }}>
                <button onClick={() => setShowAlertModal(false)}>
                  Cancel
                </button>

                <button
                  onClick={createAlert}
                  style={{ marginLeft: 10 }}
                >
                  Create Alert
                </button>
              </div>
            </div>
          </>
        )}
    </>
  );
}