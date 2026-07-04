import React, { useState } from "react";
import ReactDOM from "react-dom";
import { useTranslation } from "react-i18next";
import { useStories } from "../hooks/useStories";
import { useCreateStory } from "../hooks/useCreateStory";
import StoryRing from "./StoryRing";
import StoryViewer from "./StoryViewer";
import StoryCreator from "./StoryCreator";

const StoryBar = () => {
  const { t } = useTranslation();
  const { myGroup, friendGroups, loading, currentUserId, markSeen, reload } = useStories();
  const { deleteStory } = useCreateStory(currentUserId, reload);

  const [viewer,      setViewer]      = useState(null);
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

  const handleMyRingClick = () => {
    if (!myGroup || myGroup.stories.length === 0) {
      setCreatorOpen(true);
    } else {
      setViewer({ groupIndex: 0, storyIndex: 0 });
    }
  };

  // Borra historia y cierra el viewer
  const handleDelete = (story) => {
    deleteStory(story); // async fire-and-forget: borra Storage + DB + llama reload()
    setViewer(null);
  };

  return (
    <>
      <div style={barStyle}>
        {/* Anillo propio siempre primero */}
        {myGroup && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <StoryRing
              avatarUrl={myGroup.avatarUrl}
              nombre={myGroup.nombre}
              label={t("stories.myStory")}
              variant={myGroup.stories.length === 0 ? "add" : "own"}
              onClick={handleMyRingClick}
            />
            {/* Badge "+" persistente cuando ya hay historias activas */}
            {myGroup.stories.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setCreatorOpen(true); }}
                title={t("stories.addStory")}
                style={addBadgeStyle}
              >
                +
              </button>
            )}
          </div>
        )}

        {/* Historias de amigos */}
        {friendGroups.map((group, i) => (
          <StoryRing
            key={group.userId}
            avatarUrl={group.avatarUrl}
            nombre={group.nombre}
            variant={group.hasUnseen ? "unseen" : "seen"}
            onClick={() => setViewer({ groupIndex: i + 1, storyIndex: 0 })}
          />
        ))}

        {/* Estado vacío */}
        {friendGroups.length === 0 && myGroup?.stories.length === 0 && (
          <p style={{ fontSize: 12, color: "#5a4535", margin: "auto 0", paddingLeft: 4 }}>
            {t("stories.emptyBar")}
          </p>
        )}
      </div>

      {/* Viewer — portal a document.body */}
      {viewer !== null && ReactDOM.createPortal(
        <StoryViewer
          groups={allGroups}
          initialGroupIndex={viewer.groupIndex}
          initialStoryIndex={viewer.storyIndex}
          currentUserId={currentUserId}
          onMarkSeen={markSeen}
          onClose={() => setViewer(null)}
          onDelete={handleDelete}
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
  display:         "flex",
  alignItems:      "center",
  gap:             16,
  padding:         "12px 0 14px",
  overflowX:       "auto",
  scrollbarWidth:  "none",
  msOverflowStyle: "none",
  marginBottom:    16,
  borderBottom:    "1px solid #2e2215",
};

const skeletonStyle = {
  width:        62,
  height:       62,
  borderRadius: "50%",
  background:   "#1c1409",
  flexShrink:   0,
  animation:    "pulse 1.4s ease-in-out infinite",
};

// Badge "+" en la esquina inferior-derecha del anillo (= misma posición que el badge de StoryRing)
const addBadgeStyle = {
  position:       "absolute",
  top:            40,        // ≈ bottom edge of the 62px ring circle
  right:          -2,
  width:          20,
  height:         20,
  borderRadius:   "50%",
  background:     "#d4af37",
  color:          "#0d0a06",
  fontSize:       14,
  fontWeight:     700,
  border:         "2px solid #0d0a06",
  cursor:         "pointer",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  lineHeight:     1,
  padding:        0,
  zIndex:         1,
};

export default StoryBar;
