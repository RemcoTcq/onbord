"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import React, { useEffect, useState, useRef } from "react";
import { buildDefaultPipeline, withLockedNodes } from "@/lib/pipelineTemplate";
import { updateJobDetails } from "@/lib/actions/candidate";
import { Check, Clock, BrainCircuit, FileCheck2, Video, MessageSquare, AlertTriangle, ShieldCheck, User, HandHeart, Plus, Minus, GripVertical, Trash2, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Loader2, Search, Phone, MapPin, CheckSquare, Lock, MoreHorizontal } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import QualifyingQuestionsConfig from "./QualifyingQuestionsConfig";

import CvScoringCriteria from "./CvScoringCriteria";
import EmployerBrandingForm from "@/components/settings/EmployerBrandingForm";
import PipelineVisualEditor from "./PipelineVisualEditor";

export default function JobFormStepRecommendation({ jobData, savedJobId, onSave, isSaving, onBack, experienceLocale = "fr" }) {
  const t = useT();
  const [flowNodes, setFlowNodes] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  // Dernier état déjà en base, pour n'écrire que sur changement réel.
  const lastSavedRef = useRef(null);

  useEffect(() => {
    if (jobData && isInitializing) {
      if (jobData.saved_flow_nodes && jobData.saved_flow_nodes.length > 0) {
        const isV2 = jobData.saved_flow_nodes.some(n => n.v2);
        const nodes = isV2
          ? jobData.saved_flow_nodes
          : withLockedNodes(jobData.saved_flow_nodes.map(n => n.type === 'accueil' ? { ...n, v2: true } : n));
        setFlowNodes(nodes);
        // Repris de la base : rien à réécrire tant que le recruteur ne touche à rien.
        lastSavedRef.current = JSON.stringify(nodes);
      } else {
        // Pipeline par défaut — même fonction que la fiche offre, pour que les
        // deux écrans proposent exactement la même chose. `lastSavedRef` reste
        // nul : la proposition sera enregistrée aussitôt (effet ci-dessous),
        // afin qu'un abandon avant validation ne la perde pas.
        setFlowNodes(buildDefaultPipeline(jobData, experienceLocale));
      }
      setIsInitializing(false);
    }
  }, [jobData, isInitializing, experienceLocale]);

  // Enregistrement continu du brouillon. La pipeline ne vivait qu'en mémoire
  // jusqu'à la validation : quitter l'étape 3 effaçait la proposition et tout
  // le travail d'édition. On la persiste dès qu'elle change, sans toucher au
  // statut de l'offre — elle reste un brouillon tant qu'elle n'est pas validée.
  useEffect(() => {
    if (isInitializing || !savedJobId || flowNodes.length === 0) return;
    const payload = JSON.stringify(flowNodes);
    if (payload === lastSavedRef.current) return;

    const timer = setTimeout(async () => {
      const res = await updateJobDetails(savedJobId, { saved_flow_nodes: flowNodes });
      if (res?.success) lastSavedRef.current = payload;
      else console.error("Échec de l'enregistrement du brouillon de pipeline :", res?.error);
    }, 800);
    return () => clearTimeout(timer);
  }, [flowNodes, isInitializing, savedJobId]);

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
      </div>
    );
  }



  const ONBORD_NODE_TYPES = new Set(['accueil', 'qualifying_questions', 'cv_scoring', 'assessment', 'ai_interview', 'single_video_question', 'remerciements']);

  const calculateTotalTime = () => {
    return flowNodes.reduce((acc, node) => {
      return acc + (node.type === 'assessment' ? 8 : node.type === 'ai_interview' ? 12 : node.type === 'single_video_question' ? 3 : node.type === 'qualifying_questions' ? 2 : 0);
    }, 0);
  };

  const totalTime = calculateTotalTime();



  const handleDeleteNode = (e, nodeId) => {
    e.stopPropagation();
    setFlowNodes(prev => prev.filter(n => n.id !== nodeId));
  };

  const handleSaveFlow = () => {
    const saveableNodes = flowNodes.map(n => ({ ...n, v2: true }));
    onSave(saveableNodes, jobData);
  };

  const handleAddNode = (type) => {
    const newNode = {
      id: type + '_' + Date.now(),
      type: type,
      config: type === 'single_video_question' ? { questions: [], max_duration_seconds: 120, max_retakes: 1, evaluation_mode: "ai" } 
            : type === 'assessment' ? { title: t("dashboard.jobDetail.skillsTest") }
            : type === 'qualifying_questions' ? { questions: [] }
            : {}
    };
    
    const newNodes = [...flowNodes];
    const firstLockedAfterIndex = newNodes.findIndex(n => n.locked && n.type === 'entretien_visio');
    const insertAt = firstLockedAfterIndex !== -1 ? firstLockedAfterIndex : newNodes.length - 1;
    newNodes.splice(insertAt, 0, newNode);
    setFlowNodes(newNodes);
    setShowAddMenu(false);
  };

  const isFlowValid = flowNodes.every(node => {
    if (!ONBORD_NODE_TYPES.has(node.type)) return true;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', background: 'transparent' }}>
      
      <div className="no-pan" style={{
        background: 'white',
        borderBottom: '1px solid var(--ds-line-2)',
        padding: '12px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {onBack && (
            <button 
              onClick={() => onBack(flowNodes)}
              className="ds-icon-btn ds-icon-btn-outline"
              title={t("dashboard.recommendation.backToSkills")}
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div>
            <h2 className="ds-h2" style={{ marginBottom: 2 }}>
              {jobData?.title || t("dashboard.recommendation.fallbackTitle")}
            </h2>
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--ds-ink-4)' }}>
              <span>{jobData?.category || 'Vente'}</span>
              <span>•</span>
              <span>{jobData?.sub_family || jobData?.role_type?.split(' — ')[0] || t("dashboard.recommendation.fallbackRoleType")}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span className={`ds-chip ds-chip-lg ${totalTime > 30 ? 'ds-chip-red' : ''}`}>
            <Clock size={13} />
            <span className="ds-mono">{totalTime} min</span>
          </span>
          <button 
            className="ds-btn ds-btn-primary"
        onClick={handleSaveFlow}
            disabled={!isFlowValid || isSaving}
            title={!isFlowValid ? t("dashboard.recommendation.configureAllModules") : ""}
          >
            {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : t("dashboard.recommendation.validate")}
          </button>
        </div>
      </div>
      
      {/* PIPELINE CARD LAYOUT */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: 'var(--ds-soft)' }}>
        <PipelineVisualEditor 
          nodes={flowNodes}
          isEditable={true}
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onNodesChange={setFlowNodes}
        />
      </div>
    </div>
  );
}

