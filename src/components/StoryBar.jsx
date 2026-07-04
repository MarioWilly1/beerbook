import React, { useState } from "react";
import ReactDOM from "react-dom";
import { useTranslation } from "react-i18next";
import { useStories } from "../hooks/useStories";
import StoryRing from "./StoryRing";
import StoryViewer from "./StoryViewer";
import StoryCreator from "./StoryCreator";

const StoryBar = () => {
  const { t } = useTranslation();
  const { myGroup, friendGroups, loading, currentUserId, markSeen, reload } = useStories();

  // { groupIndex, storyIndex } — null = cerrado
  // groupIndex -1 = mis historias
  const [viewer, setViewer] = useState(null);
  const [creatorOpen, setCreatorOpen] = useState(false);

  if (loading) {
    return (
      <div style={barStyle}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={skeletonStyle} />
        ))}
      </div>
    );
  }

  const allGroups = myGroup ? [myGroup, ...friendGroups] : friendGroups;

  const openGroup = (groupIndex, storyIndex = 0) => {
    // Si es mi grupo y no tengo historias → abrir creator
    if (groupIndex === 0 && myGroup && myGroup.stories.length === 0) {
      setCreatorOpen(true);
      return;
    }
    setViewer({ groupIndex, storyIndex });
  };

  const handleMyRingClick = () => {
    if (!myGroup || myGroup.stories.length === 0) {
      setCreatorOpen(true);
    } else {
      setViewer({ groupIndex: 0, storyIndex: 0 });
    }
  };

  return (
    <>
      <div style={barStyle}>
        {/* Anillo propio siempre primero */}
        {myGroup && (
          <StoryRing
            avatarUrl={myGroup.avatarUrl}
            nombre={myGroup.nombre}
            label={t("stories.myStory")}
            variant={
              myGroup.stories.length === 0
                ? "add"
                : myGroup.hasUnseen
                ? "own"
                : "own"
            }
            onClick={handleMyRingClick}
          />
        )}

        {/* Historias de amigos */}
        {friendGroups.map((group, i) => (
          <StoryRing
            key={group.userId}
            avatarUrl={group.avatarUrl}
            nombre={group.nombre}
            variant={group.hasUnseen ? "unseen" : "seen"}
            onClick={() => openGroup(i + 1)}   // +1 porque myGroup ocupa índice 0
          />
        ))}

        {/* Estado vacío: solo si no hay nada de nadie */}
        {friendGroups.length === 0 && myGroup?.stories.length === 0 && (
          <p style={{ fontSize: 12, color: "#5a4535", margin: "auto 0", paddingLeft: 4 }}>
            {t("stories.emptyBar")}
          </p>
        )}
      </div>

      {/* Viewer — portal a document.body para escapar cualquier stacking context */}
      {viewer !== null && ReactDOM.createPortal(
        <StoryViewer
          groups={allGroups}
          initialGroupIndex={viewer.groupIndex}
          initialStoryIndex={viewer.storyIndex}
          currentUserId={currentUserId}
          onMarkSeen={markSeen}
          onClose={() => setViewer(null)}
          onOpenCreator={() => { setViewer(null); setCreatorOpen(true); }}
        />,
        document.body
      )}

      {/* Creator — portal a document.body */}
      {creatorOpen && ReactDOM.createPortal(
        <StoryCreator
          currentUserId={currentUserId}
          onClose={() => setCreatorOpen(false)}
          onSuccess={() => { setCreatorOpen(false); reload(); }}
        />,
        document.body
      )}
    </>
  );
};

const barStyle = {
  display:        "flex",
  alignItems:     "center",
  gap:            16,
  padding:        "12px 0 14px",
  overflowX:      "auto",
  scrollbarWidth: "none",      // Firefox
  msOverflowStyle: "none",     // IE
  marginBottom:   16,
  borderBottom:   "1px solid #2e2215",
};

const skeletonStyle = {
  width:        62,
  height:       62,
  borderRadius: "50%",
  background:   "#1c1409",
  flexShrink:   0,
  animation:    "pulse 1.4s ease-in-out infinite",
};

export default StoryBar;
