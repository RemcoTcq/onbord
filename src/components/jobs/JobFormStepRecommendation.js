"use client";

import React, { useEffect, useState, useRef } from "react";
import { generateRecommendation, generateQualifyingQuestions } from "@/lib/recommendationEngine";
import { Check, Clock, BrainCircuit, FileCheck2, Video, MessageSquare, AlertTriangle, ShieldCheck, User, HandHeart, Plus, Minus, GripVertical, Trash2, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Loader2, Search, Phone, MapPin, CheckSquare, Lock, MoreHorizontal } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import QualifyingQuestionsConfig from "./QualifyingQuestionsConfig";

import VideoInterviewConfig from "./VideoInterviewConfig";
import AiInterviewConfig from "./AiInterviewConfig";
import CvScoringCriteria from "./CvScoringCriteria";
import EmployerBrandingForm from "@/components/settings/EmployerBrandingForm";
import PipelineNodeConfigPanel from "./PipelineNodeConfigPanel";
import PipelineVisualEditor from "./PipelineVisualEditor";
import AssessmentSelectionModal from '../assessment/AssessmentSelectionModal';
import AssessmentActionModal from '../assessment/AssessmentActionModal';
import AssessmentCreationFlow from '../assessment/AssessmentCreationFlow';
import { getTestsLibrary } from '@/lib/actions/assessment';

export default function JobFormStepRecommendation({ jobData, savedJobId, onSave, isSaving, onBack }) {
  const [flowNodes, setFlowNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showAssessmentActionModal, setShowAssessmentActionModal] = useState(false);
  const [assessmentCreationMode, setAssessmentCreationMode] = useState(false);
  const [linkingNodeId, setLinkingNodeId] = useState(null);
  const [testsLibrary, setTestsLibrary] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  // Load library for linking
  useEffect(() => {
    getTestsLibrary().then(res => {
      if (res.success) setTestsLibrary(res.tests);
    });
  }, []);
  
  useEffect(() => {
    if (jobData && isInitializing) {
      console.log("JobFormStepRecommendation init. jobData.saved_flow_nodes:", jobData.saved_flow_nodes);

      const lockedBefore = [
        { id: 'locked_sourcing', type: 'sourcing', locked: true, config: {} },
      ];
      const lockedAfter = [
        { id: 'locked_entretien_visio', type: 'entretien_visio', locked: true, config: {} },
        { id: 'locked_entretien_site', type: 'entretien_site', locked: true, config: {} },
        { id: 'locked_debrief_finale', type: 'debrief_finale', locked: true, config: {} },
      ];

      if (jobData.saved_flow_nodes && jobData.saved_flow_nodes.length > 0) {
        const isV2 = jobData.saved_flow_nodes.some(n => n.v2);
        if (isV2) {
          setFlowNodes(jobData.saved_flow_nodes);
        } else {
          const onbordNodes = jobData.saved_flow_nodes.map(n => n.type === 'accueil' ? { ...n, v2: true } : n);
          const v2LockedBefore = lockedBefore.map(n => ({ ...n, v2: true }));
          const v2LockedAfter = lockedAfter.map(n => ({ ...n, v2: true }));
          setFlowNodes([...v2LockedBefore, ...onbordNodes, ...v2LockedAfter]);
        }
      } else {
        console.log("Generating from scratch");
        const rec = generateRecommendation(jobData);
        const onbordNodes = [];
        
        onbordNodes.push({
          id: 'accueil',
          type: 'accueil',
          config: { text: "Bienvenue sur notre espace de recrutement. Nous sommes ravis de découvrir votre profil." }
        });

        if (rec.steps.some(s => s.type === 'qualifying_questions')) {
          onbordNodes.push({
            id: 'qualif_' + Date.now(),
            type: 'qualifying_questions',
            config: { questions: generateQualifyingQuestions(jobData) }
          });
        }
        
        if (rec.steps.some(s => s.type === 'skills_test')) {
          const skillsTestStep = rec.steps.find(s => s.type === 'skills_test');
          if (skillsTestStep && skillsTestStep.covered_skills) {
            const uniqueTests = [];
            skillsTestStep.covered_skills.forEach(skill => {
              if (skill.test_db_id && !uniqueTests.find(t => t.id === skill.test_db_id)) {
                uniqueTests.push({ id: skill.test_db_id, name: skill.suggested_test });
              }
            });
          
          uniqueTests.forEach((t, idx) => {
            onbordNodes.push({
              id: 'skill_' + t.id + '_' + Date.now() + idx,
              type: 'assessment',
              config: { title: "Test de compétences" }
            });
          });
        }
      }

      if (rec.steps.some(s => s.type === 'video_interview')) {
        onbordNodes.push({
          id: 'video_' + Date.now(),
          type: 'single_video_question',
          config: { 
            evaluation_mode: "ai",
            questions: [{
              id: `custom_${Date.now()}`,
              text: "",
              category: "Custom",
              hint: "",
              weight: 1,
              source: "custom",
              criteria: [],
            }], 
            max_duration_seconds: 120, 
            max_retakes: 1 
          }
        });
      }

      onbordNodes.push({
        id: 'remerciements',
        type: 'remerciements',
        config: { text: "Merci pour votre temps. Vos réponses ont bien été enregistrées." }
      });

      const onbordNodesV2 = onbordNodes.map(n => ({ ...n, v2: true }));
      const v2LockedBefore = lockedBefore.map(n => ({ ...n, v2: true }));
      const v2LockedAfter = lockedAfter.map(n => ({ ...n, v2: true }));
      setFlowNodes([...v2LockedBefore, ...onbordNodesV2, ...v2LockedAfter]);
    }
    setIsInitializing(false);
    }
  }, [jobData, isInitializing]);

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
      </div>
    );
  }

  if (assessmentCreationMode) {
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--background)', zIndex: 50, overflowY: 'auto' }}>
        <AssessmentCreationFlow 
          jobData={jobData}
          onCancel={() => setAssessmentCreationMode(false)}
          onTestCreated={async (testId) => {
            setAssessmentCreationMode(false);
            const res = await getTestsLibrary();
            if (res.success) {
              setTestsLibrary(res.tests);
              const testData = res.tests.find(t => t.id === testId);
              if (testData) {
                handleUpdateNodeConfig(linkingNodeId, {
                  ...flowNodes.find(n => n.id === linkingNodeId)?.config,
                  test_id: testId,
                  title: testData.name
                });
                setLinkingNodeId(null);
              }
            }
          }}
        />
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

  const handleUpdateNodeConfig = (nodeId, newConfig) => {
    setFlowNodes(prev => prev.map(n => n.id === nodeId ? { ...n, config: newConfig } : n));
  };

  const handleDeleteNode = (e, nodeId) => {
    e.stopPropagation();
    setFlowNodes(prev => prev.filter(n => n.id !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleSaveFlow = async () => {
    const saveableNodes = flowNodes.map(n => ({ ...n, v2: true }));
    onSave(saveableNodes, jobData);
  };

  const handleAddNode = (type) => {
    const newNode = {
      id: type + '_' + Date.now(),
      type: type,
      config: type === 'single_video_question' ? { questions: [{
                id: `custom_${Date.now()}`,
                text: "",
                category: "Custom",
                hint: "",
                weight: 1,
                source: "custom",
                criteria: [],
              }], max_duration_seconds: 120, max_retakes: 1 } 
            : type === 'assessment' ? { title: "Test de compétences" }
            : type === 'qualifying_questions' ? { questions: [] }
            : {}
    };
    
    const newNodes = [...flowNodes];
    const firstLockedAfterIndex = newNodes.findIndex(n => n.locked && n.type === 'entretien_visio');
    const insertAt = firstLockedAfterIndex !== -1 ? firstLockedAfterIndex : newNodes.length - 1;
    newNodes.splice(insertAt, 0, newNode);
    setFlowNodes(newNodes);
    setShowAddMenu(false);
    setSelectedNodeId(newNode.id);
  };

  const isFlowValid = flowNodes.every(node => {
    if (!ONBORD_NODE_TYPES.has(node.type)) return true;
    if (node.type === 'qualifying_questions') {
      return node.config?.questions && node.config.questions.length > 0;
    }
    if (node.type === 'single_video_question') {
      return node.config?.questions && node.config.questions.length > 0;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', background: 'transparent' }}>
      
      <div className="no-pan" style={{
        background: 'white',
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {onBack && (
            <button 
              onClick={() => onBack(flowNodes)}
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'transparent',
                cursor: 'pointer', color: 'var(--foreground)'
              }}
              title="Retour à la sélection des compétences"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--foreground)', margin: 0, marginBottom: '2px' }}>
              {jobData?.title || 'Account Manager'}
            </h2>
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
              <span>{jobData?.category || 'Vente'}</span>
              <span>•</span>
              <span>{jobData?.sub_family || jobData?.role_type?.split(' — ')[0] || 'Contributeur Individuel'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--foreground)' }}>
            <Clock size={14} style={{ color: totalTime > 30 ? '#ef4444' : 'var(--foreground)' }} />
            <span style={{ fontWeight: '800', color: totalTime > 30 ? '#ef4444' : 'var(--foreground)' }}>{totalTime} min</span>
          </div>
          <button 
            className="btn btn-primary"
            style={{ padding: '8px 24px', fontWeight: '600', background: 'var(--foreground)', borderColor: 'var(--foreground)', color: 'var(--background)', borderRadius: '6px', opacity: (!isFlowValid || isSaving) ? 0.5 : 1, cursor: (!isFlowValid || isSaving) ? 'not-allowed' : 'pointer' }}
        onClick={handleSaveFlow}
            disabled={!isFlowValid || isSaving}
            title={!isFlowValid ? "Veuillez configurer tous les modules ajoutés (questions, vidéo, test) avant de valider." : ""}
          >
            {isSaving ? <Loader2 size={16} className="spin" /> : 'Valider'}
          </button>
        </div>
      </div>
      
      {/* PIPELINE CARD LAYOUT */}
      <div style={{ flex: 1, overflow: 'auto', padding: '2rem', background: '#f8fafc' }}>
        <PipelineVisualEditor 
          nodes={flowNodes}
          isEditable={true}
          selectedNodeId={selectedNodeId}
          onNodeClick={setSelectedNodeId}
          onAssessmentClick={(nodeId) => {
            setSelectedNodeId(null);
            setLinkingNodeId(nodeId);
            setShowAssessmentActionModal(true);
          }}
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onNodesChange={setFlowNodes}
        />
      </div>

      {/* CONFIG SIDEBAR */}
      {selectedNodeId && (
        <PipelineNodeConfigPanel 
          selectedNode={flowNodes.find(n => n.id === selectedNodeId)}
          nodeTypeInfo={null}
          jobData={jobData}
          onClose={() => setSelectedNodeId(null)}
          onUpdateConfig={handleUpdateNodeConfig}
          onLinkAssessmentClick={(nodeId) => {
            setSelectedNodeId(null);
            setLinkingNodeId(nodeId);
            setShowAssessmentModal(true);
          }}
          onAIAssessmentClick={(nodeId) => {
            setSelectedNodeId(null);
            setLinkingNodeId(nodeId);
            setShowAssessmentActionModal(true);
          }}
        />
      )}

      {/* Modals for Assessments */}
      {showAssessmentModal && linkingNodeId && (
        <AssessmentSelectionModal
          isOpen={true}
          jobId={savedJobId}
          onClose={() => {
            setShowAssessmentModal(false);
            setLinkingNodeId(null);
          }}
          onSelect={(test) => {
            handleUpdateNodeConfig(linkingNodeId, {
              ...flowNodes.find(n => n.id === linkingNodeId)?.config,
              test_id: test.id,
              title: test.name
            });
            setShowAssessmentModal(false);
            setLinkingNodeId(null);
          }}
          testsLibrary={testsLibrary}
        />
      )}

      {showAssessmentActionModal && linkingNodeId && (
        <AssessmentActionModal
          isOpen={true}
          onClose={() => {
            setShowAssessmentActionModal(false);
            setLinkingNodeId(null);
          }}
          onAddAI={() => {
            setShowAssessmentActionModal(false);
            setAssessmentCreationMode(true);
          }}
          onSelectLibrary={() => {
            setShowAssessmentActionModal(false);
            setShowAssessmentModal(true);
          }}
        />
      )}
    </div>
  );
}
