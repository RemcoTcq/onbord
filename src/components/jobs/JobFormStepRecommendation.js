"use client";

import React, { useEffect, useState, useRef } from "react";
import { generateRecommendation, generateQualifyingQuestions } from "@/lib/recommendationEngine";
import { Check, Clock, BrainCircuit, FileCheck2, Video, MessageSquare, AlertTriangle, ShieldCheck, User, HandHeart, Plus, Minus, GripVertical, Trash2, X, ChevronUp, ChevronDown, ChevronLeft, Loader2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import QualifyingQuestionsConfig from "./QualifyingQuestionsConfig";
import SkillsTestConfig from "./SkillsTestConfig";
import VideoInterviewConfig from "./VideoInterviewConfig";
import AiInterviewConfig from "./AiInterviewConfig";
import CvScoringCriteria from "./CvScoringCriteria";
import EmployerBrandingForm from "@/components/settings/EmployerBrandingForm";

function MessageBrandingTabs({ type, text, onChangeText }) {
  const [tab, setTab] = useState("message");
  
  return (
    <div style={{ margin: "-1.5rem", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "#fafafa", padding: "0 1.5rem" }}>
        <button 
          onClick={() => setTab("message")}
          style={{ 
            padding: "1rem 1.5rem", border: "none", background: "transparent", cursor: "pointer",
            fontWeight: tab === "message" ? "700" : "500",
            color: tab === "message" ? "var(--primary)" : "var(--muted-foreground)",
            borderBottom: tab === "message" ? "2px solid var(--primary)" : "2px solid transparent",
            transition: "all 0.2s"
          }}
        >
          Message
        </button>
        <button 
          onClick={() => setTab("branding")}
          style={{ 
            padding: "1rem 1.5rem", border: "none", background: "transparent", cursor: "pointer",
            fontWeight: tab === "branding" ? "700" : "500",
            color: tab === "branding" ? "var(--primary)" : "var(--muted-foreground)",
            borderBottom: tab === "branding" ? "2px solid var(--primary)" : "2px solid transparent",
            transition: "all 0.2s"
          }}
        >
          Marque Employeur
        </button>
      </div>
      
      <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto" }}>
        {tab === "message" && (
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
              {type === 'accueil' ? "Message d'accueil candidat" : "Message de fin de parcours"}
            </label>
            <textarea 
              className="input-field" 
              rows={6}
              value={text || ""}
              onChange={(e) => onChangeText(e.target.value)}
              placeholder="Saisissez votre message..."
            />
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '8px' }}>
              {type === 'accueil' 
                ? "Ce texte sera affiché sur la première page du parcours, avant que le candidat ne commence les évaluations. Vous pouvez utiliser la balise {first_name} pour personnaliser le message." 
                : "Ce texte sera affiché une fois toutes les étapes complétées. Vous pouvez utiliser la balise {first_name} pour personnaliser le message."}
            </p>
          </div>
        )}
        
        {tab === "branding" && (
          <EmployerBrandingForm showContextWarning={true} />
        )}
      </div>
    </div>
  );
}

function SortableFlowItem({ node, index, isFirst, isLast, isFixed, isUnmovable, isSelected, setSelectedNodeId, handleDeleteNode, nodeMeta, infoQuestions, infoTime, subTitle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: node.id, disabled: isFixed || isUnmovable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
    marginBottom: isLast ? '0' : '24px',
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 99 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="node-element">
      {!isLast && !isDragging && (
        <div style={{ 
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          width: '1px', height: '24px', background: 'var(--foreground)', zIndex: 0
        }} />
      )}

      {isFixed ? (
        <div 
          onClick={() => setSelectedNodeId(node.id)}
          style={{
            position: 'relative', zIndex: 1, 
            background: 'white',
            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: '6px', padding: '10px 20px',
            boxShadow: isSelected ? '0 0 0 1px var(--primary)' : '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--foreground)' }}>
            {nodeMeta.label}
          </span>
          {isFirst && <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--foreground)' }} />}
          {isLast && <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--foreground)' }} />}
        </div>
      ) : (
        <div 
          onClick={() => setSelectedNodeId(node.id)}
          style={{
            position: 'relative', zIndex: 1, width: '100%',
            background: 'white',
            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: '8px', padding: '0.875rem 1.25rem',
            boxShadow: isSelected ? '0 0 0 1px var(--primary)' : isDragging ? '0 12px 24px rgba(0,0,0,0.1)' : '0 2px 5px rgba(0,0,0,0.02)',
            cursor: 'grab', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            transform: isDragging ? 'scale(1.02)' : 'none'
          }}
        >
          {isUnmovable ? (
            <div style={{ width: '24px', height: '24px' }}></div>
          ) : (
            <div {...attributes} {...listeners} style={{ color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', cursor: 'grab', padding: '4px' }}>
              <GripVertical size={16} />
            </div>
          )}
          
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--foreground)', margin: 0 }}>
              {node.type === 'single_skill_test' ? (node.config.tests?.[0]?.test_name || nodeMeta.label) : 
               node.type === 'single_video_question' ? (node.config.questions?.[0]?.text || nodeMeta.label) : 
               nodeMeta.label}
            </h3>
            {subTitle && (
              <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: '2px 0 0 0' }}>
                {subTitle}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
            {infoQuestions && <span>{infoQuestions}</span>}
            {infoQuestions && infoTime && <span style={{ color: 'var(--border)', height: '12px', width: '1px', background: 'var(--border)' }}></span>}
            {infoTime && <span>{infoTime}</span>}
            
            <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
            
            <button 
              onClick={(e) => { e.stopPropagation(); handleDeleteNode(e, node.id); }}
              style={{ color: 'var(--destructive)', padding: '6px', borderRadius: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobFormStepRecommendation({ jobData, savedJobId, onSave, isSaving, onBack }) {
  const [flowNodes, setFlowNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  // Pan states
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  useEffect(() => {
    if (jobData && isInitializing) {
      console.log("JobFormStepRecommendation init. jobData.saved_flow_nodes:", jobData.saved_flow_nodes);
      if (jobData.saved_flow_nodes && jobData.saved_flow_nodes.length > 0) {
        console.log("Restoring from saved_flow_nodes:", jobData.saved_flow_nodes);
        setFlowNodes(jobData.saved_flow_nodes);
      } else {
        console.log("Generating from scratch");
        const rec = generateRecommendation(jobData);
        const initialNodes = [];
        
        initialNodes.push({
          id: 'accueil',
          type: 'accueil',
          config: { text: "Bienvenue sur notre espace de recrutement. Nous sommes ravis de découvrir votre profil." }
        });

        if (rec.steps.some(s => s.type === 'qualifying_questions')) {
          initialNodes.push({
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
            initialNodes.push({
              id: 'skill_' + t.id + '_' + Date.now() + idx,
              type: 'single_skill_test',
              config: { tests: [{ test_id: t.id, test_name: t.name ? t.name.replace('Test — ', '') : 'Test technique', selected_question_ids: [] }] } // Encapsulate in array for compatibility with SkillsTestConfig
            });
          });
        }
      }

      if (rec.steps.some(s => s.type === 'video_interview')) {
        // Init with one empty video question
        initialNodes.push({
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

      initialNodes.push({
        id: 'remerciements',
        type: 'remerciements',
        config: { text: "Merci pour votre temps. Vos réponses ont bien été enregistrées." }
      });

      setFlowNodes(initialNodes);
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

  const NODE_TYPES = {
    accueil: { icon: User, label: "Accueil Candidat", color: "#3b82f6", time: 0 },
    qualifying_questions: { icon: ShieldCheck, label: "Questions qualificatives", color: "#8b5cf6", time: 2 },
    cv_scoring: { icon: FileCheck2, label: "Scoring CV (IA)", color: "#10b981", time: 0 },
    single_skill_test: { icon: BrainCircuit, label: "Test technique", color: "#f59e0b", time: 8 },
    ai_interview: { icon: MessageSquare, label: "Interview IA par Texte", color: "#ec4899", time: 12 },
    single_video_question: { icon: Video, label: "Question Vidéo", color: "#ef4444", time: 3 },
    remerciements: { icon: HandHeart, label: "Remerciements", color: "#14b8a6", time: 0 },
  };

  const calculateTotalTime = () => {
    return flowNodes.reduce((acc, node) => {
      return acc + (NODE_TYPES[node.type]?.time || 0);
    }, 0);
  };

  const totalTime = calculateTotalTime();
  const totalActivities = flowNodes.filter(n => n.type !== 'accueil' && n.type !== 'remerciements').length;
  const totalQuestions = flowNodes.reduce((acc, node) => {
      if (node.type === 'qualifying_questions') return acc + (node.config?.questions?.length || 0);
      if (node.type === 'single_skill_test') return acc + 10;
      if (node.type === 'single_video_question') return acc + 1;
      return acc;
  }, 0);

  const handleUpdateNodeConfig = (nodeId, newConfig) => {
    setFlowNodes(prev => prev.map(n => n.id === nodeId ? { ...n, config: newConfig } : n));
  };

  const handleDeleteNode = (e, nodeId) => {
    e.stopPropagation();
    setFlowNodes(prev => prev.filter(n => n.id !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleMoveNode = (e, index, direction) => {
    e.stopPropagation();
    if (direction === 'up' && index > 1) {
      const newNodes = [...flowNodes];
      [newNodes[index - 1], newNodes[index]] = [newNodes[index], newNodes[index - 1]];
      setFlowNodes(newNodes);
    } else if (direction === 'down' && index < flowNodes.length - 2) {
      const newNodes = [...flowNodes];
      [newNodes[index + 1], newNodes[index]] = [newNodes[index], newNodes[index + 1]];
      setFlowNodes(newNodes);
    }
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
            : type === 'single_skill_test' ? { tests: [] }
            : type === 'qualifying_questions' ? { questions: [] }
            : {}
    };
    
    const newNodes = [...flowNodes];
    newNodes.splice(newNodes.length - 1, 0, newNode);
    setFlowNodes(newNodes);
    setShowAddMenu(false);
    setSelectedNodeId(newNode.id);
  };

  // Pan Handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.node-element') || e.target.closest('.no-pan')) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const selectedNode = flowNodes.find(n => n.id === selectedNodeId);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      setFlowNodes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        if (newIndex === 0 || newIndex === items.length - 1) return items;

        const qualifIndex = items.findIndex(n => n.type === 'qualifying_questions');
        if (qualifIndex !== -1 && newIndex <= qualifIndex) return items;
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const isFlowValid = flowNodes.every(node => {
    if (node.type === 'qualifying_questions') {
      return node.config?.questions && node.config.questions.length > 0;
    }
    if (node.type === 'single_video_question') {
      return node.config?.questions && node.config.questions.length > 0;
    }
    if (node.type === 'single_skill_test') {
      return node.config?.tests && node.config.tests.length > 0 && node.config.tests[0].test_id;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', background: 'transparent' }}>
      
      {/* HEADER BAR (Solid White) */}
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
            onClick={() => onSave(flowNodes, jobData)}
            disabled={!isFlowValid || isSaving}
            title={!isFlowValid ? "Veuillez configurer tous les modules ajoutés (questions, vidéo, test) avant de valider." : ""}
          >
            {isSaving ? <Loader2 size={16} className="spin" /> : 'Valider'}
          </button>
        </div>
      </div>
      
      {/* FULL SCREEN CANVAS AREA */}
      <div 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          background: '#f8fafc',
          overflow: 'hidden',
          userSelect: 'none',
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            setZoom(z => Math.min(Math.max(z - e.deltaY * 0.002, 0.4), 2));
          }
        }}
      >
        {/* Contrôles de Zoom */}
        <div className="no-pan" style={{
          position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '2px',
          background: 'white', padding: '4px', borderRadius: '8px',
          border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          pointerEvents: 'auto'
        }}>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px' }}>
            <Minus size={16} color="var(--foreground)" />
          </button>
          <span style={{ fontSize: '12px', fontWeight: '500', width: '40px', textAlign: 'center', color: 'var(--foreground)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px' }}>
            <Plus size={16} color="var(--foreground)" />
          </button>
        </div>

        {/* FLOW RENDERING CANVAS */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
            paddingTop: '4rem', paddingBottom: '10rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            minHeight: '100%',
            width: '100%'
          }}>
            <div style={{ position: 'relative', width: '550px' }}>
              <SortableContext 
                items={flowNodes.map(n => n.id)}
                strategy={verticalListSortingStrategy}
              >
                {flowNodes.map((node, index) => {
                  const isFirst = index === 0;
                  const isLast = index === flowNodes.length - 1;
                  const isFixed = isFirst || isLast;
                  const isUnmovable = node.type === 'qualifying_questions';
                  const isSelected = selectedNodeId === node.id;
                  const nodeMeta = NODE_TYPES[node.type];

                  let subTitle = "";
                  let infoQuestions = "";
                  let infoTime = "";
                  
                  if (node.type === 'qualifying_questions') {
                    infoQuestions = `${node.config?.questions?.length || 0} questions`;
                    infoTime = `${nodeMeta.time} min`;
                  } else if (node.type === 'single_skill_test') {
                    subTitle = "Tests de compétences";
                    infoQuestions = `10 questions`;
                    infoTime = `${nodeMeta.time} min`;
                  } else if (node.type === 'single_video_question') {
                    subTitle = "Question vidéo";
                    infoQuestions = `1 question`;
                    infoTime = `${nodeMeta.time} min`;
                  } else if (node.type === 'ai_interview') {
                    subTitle = "Interview IA - texte";
                    infoTime = `${nodeMeta.time} min`;
                  } else if (node.type === 'cv_scoring') {
                    subTitle = "Filtrage automatique";
                  }

                  return (
                    <React.Fragment key={node.id}>
                      {isLast && (
                        <div className="node-element" style={{ 
                          position: 'relative', width: '100%', paddingBottom: '24px', 
                          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 
                        }}>
                          {/* Ligne noire continue pour combler l'espace */}
                          <div style={{ 
                            position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', 
                            width: '1px', background: 'var(--foreground)', zIndex: 0 
                          }} />

                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <button 
                              onClick={() => setShowAddMenu(!showAddMenu)}
                              style={{ 
                                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'transform 0.2s'
                              }}
                            >
                              <Plus size={20} style={{ transform: showAddMenu ? 'rotate(45deg)' : 'none', transition: '0.2s' }} />
                            </button>
                            
                            {showAddMenu && (
                              <div className="fade-in" style={{ 
                                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px',
                                background: 'white', border: '1px solid var(--border)', borderRadius: '8px',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', width: '240px', overflow: 'hidden'
                              }}>
                                <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '700', color: 'var(--muted-foreground)', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                  Ajouter une étape
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  {Object.entries(NODE_TYPES).filter(([k]) => k !== 'accueil' && k !== 'remerciements').map(([type, meta]) => {
                                    const isUnique = type === 'qualifying_questions' || type === 'cv_scoring' || type === 'ai_interview';
                                    const exists = isUnique ? flowNodes.some(n => n.type === type) : false;
                                    const Icon = meta.icon;
                                    return (
                                      <button
                                        key={type}
                                        onClick={() => { if (!exists) handleAddNode(type); }}
                                        style={{
                                          display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                                          background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
                                          cursor: exists ? 'not-allowed' : 'pointer', opacity: exists ? 0.4 : 1,
                                          textAlign: 'left', width: '100%'
                                        }}
                                      >
                                        <Icon size={16} color={meta.color} />
                                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--foreground)' }}>{meta.label}</span>
                                        {exists && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <SortableFlowItem 
                        node={node}
                        index={index}
                        isFirst={isFirst}
                        isLast={isLast}
                        isFixed={isFixed}
                        isUnmovable={isUnmovable}
                        isSelected={isSelected}
                        setSelectedNodeId={setSelectedNodeId}
                        handleDeleteNode={handleDeleteNode}
                        nodeMeta={nodeMeta}
                        infoQuestions={infoQuestions}
                        infoTime={infoTime}
                        subTitle={subTitle}
                      />
                    </React.Fragment>
                  );
                })}
              </SortableContext>
            </div>
          </div>
        </DndContext>
      </div>

      {selectedNodeId && (
        <div 
          className="fade-in" 
          onClick={() => setSelectedNodeId(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 90 }} 
        />
      )}
      <div className="no-pan" style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: selectedNodeId ? 'max(60vw, 650px)' : '0px',
        background: 'white',
        borderLeft: '1px solid var(--border)',
        transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: selectedNodeId ? '-8px 0 30px rgba(0,0,0,0.1)' : 'none',
        zIndex: 100
      }}>
        {selectedNode && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--border)', background: '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${NODE_TYPES[selectedNode.type].color}15`, color: NODE_TYPES[selectedNode.type].color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {NODE_TYPES[selectedNode.type].icon && React.createElement(NODE_TYPES[selectedNode.type].icon, { size: 20 })}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--foreground)', margin: 0 }}>
                  {NODE_TYPES[selectedNode.type].label}
                </h3>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="btn-ghost" style={{ padding: '8px', borderRadius: '50%', background: 'var(--secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', paddingBottom: '6rem' }}>
              {selectedNode.type === 'accueil' && (
                <MessageBrandingTabs 
                  type="accueil"
                  text={selectedNode.config?.text}
                  onChangeText={(val) => handleUpdateNodeConfig(selectedNode.id, { text: val })}
                />
              )}
              {selectedNode.type === 'remerciements' && (
                <MessageBrandingTabs 
                  type="remerciements"
                  text={selectedNode.config?.text}
                  onChangeText={(val) => handleUpdateNodeConfig(selectedNode.id, { text: val })}
                />
              )}
              {selectedNode.type === 'qualifying_questions' && (
                <div style={{ margin: '-1.5rem' }}>
                  <div style={{ padding: '1.5rem' }}>
                    <QualifyingQuestionsConfig 
                      config={{ enabled: true, questions: selectedNode.config.questions || [] }}
                      onChange={(newConfig) => handleUpdateNodeConfig(selectedNode.id, { questions: newConfig.questions })}
                    />
                  </div>
                </div>
              )}
              {selectedNode.type === 'cv_scoring' && (
                <div style={{ margin: '-1.5rem' }}>
                  <div style={{ padding: '1.5rem' }}>
                    <CvScoringCriteria 
                      criteria={selectedNode.config.criteria || jobData?.selection_criteria || []}
                      onChange={(newCriteria) => handleUpdateNodeConfig(selectedNode.id, { criteria: newCriteria })}
                    />
                  </div>
                </div>
              )}
              {selectedNode.type === 'single_skill_test' && (
                <div style={{ margin: '-1.5rem' }}>
                  <div style={{ padding: '1.5rem' }}>
                    <SkillsTestConfig 
                      jobId={savedJobId}
                      config={{ enabled: true, tests: selectedNode.config.tests || [] }}
                      onChange={(newConfig) => {
                        // Keep only the last selected test (force single choice)
                        const latestTests = newConfig.tests;
                        if (latestTests.length > 1) {
                            handleUpdateNodeConfig(selectedNode.id, { tests: [latestTests[latestTests.length - 1]] });
                        } else {
                            handleUpdateNodeConfig(selectedNode.id, { tests: latestTests });
                        }
                      }}
                    />
                    <p style={{fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '1rem', fontStyle: 'italic', textAlign: 'center'}}>
                        Sélectionnez un seul test pour cette étape.
                    </p>
                  </div>
                </div>
              )}
              {selectedNode.type === 'single_video_question' && (
                <div style={{ margin: '-1.5rem' }}>
                  <div style={{ padding: '1.5rem' }}>
                    <VideoInterviewConfig 
                      jobId={savedJobId}
                      config={{ 
                          questions: selectedNode.config.questions || [],
                          max_duration_seconds: selectedNode.config.max_duration_seconds || 120,
                          max_retakes: selectedNode.config.max_retakes || 1,
                          evaluation_mode: selectedNode.config.evaluation_mode || "ai"
                      }}
                      onChange={(newConfig) => {
                        // Force a single question layout logic inside
                        const latestQs = newConfig.questions;
                        if (latestQs.length > 1) {
                            handleUpdateNodeConfig(selectedNode.id, { ...newConfig, questions: [latestQs[latestQs.length - 1]] });
                        } else {
                            handleUpdateNodeConfig(selectedNode.id, newConfig);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
              {selectedNode.type === 'ai_interview' && (
                <div style={{ margin: '-1.5rem' }}>
                  <div style={{ padding: '1.5rem' }}>
                    <AiInterviewConfig 
                      job={{ id: savedJobId, ...jobData }}
                      prefilledConfig={selectedNode.config}
                      embedded={true}
                      hideSaveBar={true}
                      onChange={(newConfig) => handleUpdateNodeConfig(selectedNode.id, newConfig)}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {/* Global Action Bar (Bottom Overlay so it doesn't pan) REMOVED */}
    </div>
  );
}
