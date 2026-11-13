export type CambridgeDefinition = {
  id: string;
  term: string;
  definition_text: string;
  category: string;
  source_label: string;
  topic_id: string | null;
  created_at: string;
  source_document_id: string | null;
  source_chunk_id: string | null;
  knowledge_documents: { title: string; doc_type: string; source_name: string | null } | null;
  topics: { name: string } | null;
};

export const CAMBRIDGE_CORE_DEFINITIONS: CambridgeDefinition[] = [
  {
    "id": "def_0455_0001",
    "term": "Basic economic problem",
    "definition_text": "Resources are finite but human wants are infinite, so choices must be made.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0002",
    "term": "Scarcity",
    "definition_text": "The shortage of resources relative to the unlimited wants of people.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0003",
    "term": "Wants",
    "definition_text": "Goods and services people desire; they are unlimited.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0004",
    "term": "Needs",
    "definition_text": "Goods and services essential for survival, such as food, water and shelter.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0005",
    "term": "Economic good",
    "definition_text": "A good that is scarce and has an opportunity cost, so it must be paid for.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0006",
    "term": "Free good",
    "definition_text": "A good with no opportunity cost and unlimited supply, such as air.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0007",
    "term": "Resource allocation",
    "definition_text": "How scarce resources are distributed among competing uses.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0008",
    "term": "What to produce",
    "definition_text": "The decision about which goods and services will be made.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0009",
    "term": "How to produce",
    "definition_text": "The decision about which methods and combination of resources to use.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0010",
    "term": "Who to produce for",
    "definition_text": "The decision about who will receive the output.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0011",
    "term": "Factors of production",
    "definition_text": "Resources used to produce goods and services: land, labour, capital and enterprise.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0012",
    "term": "Land",
    "definition_text": "All natural resources, such as soil, water, minerals and forests.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0013",
    "term": "Labour",
    "definition_text": "The human effort, physical and mental, used in production.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0014",
    "term": "Capital",
    "definition_text": "Man-made goods used to produce other goods, such as machinery, tools and buildings.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0015",
    "term": "Enterprise",
    "definition_text": "The risk-taking entrepreneur who organises the other factors of production.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0016",
    "term": "Rent",
    "definition_text": "The reward paid for the use of land.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0017",
    "term": "Wages",
    "definition_text": "The reward paid for labour.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0018",
    "term": "Interest",
    "definition_text": "The reward paid for the use of capital.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0019",
    "term": "Profit",
    "definition_text": "The reward for enterprise; total revenue minus total costs.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0020",
    "term": "Opportunity cost",
    "definition_text": "The next best alternative given up when a choice is made.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0021",
    "term": "Production possibility curve (PPC)",
    "definition_text": "A curve showing the maximum combinations of two goods an economy can produce with all resources fully and efficiently used.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0022",
    "term": "Point on a PPC",
    "definition_text": "Resources are fully and efficiently employed.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0023",
    "term": "Point under a PPC",
    "definition_text": "Resources are unemployed or used inefficiently.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0024",
    "term": "Point beyond a PPC",
    "definition_text": "An output combination that is currently unattainable.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0025",
    "term": "Shift of a PPC",
    "definition_text": "A change in the economy\u2019s productive capacity, caused by changes in the quantity or quality of resources; shows economic growth if outward.",
    "category": "The basic economic problem",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The basic economic problem"
    }
  },
  {
    "id": "def_0455_0026",
    "term": "Market",
    "definition_text": "Where buyers and sellers meet to exchange goods, services or resources.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0027",
    "term": "Buyers (consumers)",
    "definition_text": "Those who demand goods and services in a market.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0028",
    "term": "Sellers (producers)",
    "definition_text": "Those who supply goods and services in a market.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0029",
    "term": "Demand",
    "definition_text": "The quantity of a good or service consumers are willing and able to buy at a given price in a given period.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0030",
    "term": "Market demand",
    "definition_text": "The sum of all individual demands for a good at each price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0031",
    "term": "Extension of demand",
    "definition_text": "A rise in quantity demanded caused by a fall in price (movement along the curve).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0032",
    "term": "Contraction of demand",
    "definition_text": "A fall in quantity demanded caused by a rise in price (movement along the curve).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0033",
    "term": "Increase in demand",
    "definition_text": "A rightward shift of the demand curve; more is demanded at every price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0034",
    "term": "Decrease in demand",
    "definition_text": "A leftward shift of the demand curve; less is demanded at every price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0035",
    "term": "Supply",
    "definition_text": "The quantity of a good or service producers are willing and able to sell at a given price in a given period.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0036",
    "term": "Market supply",
    "definition_text": "The sum of all individual firms\u2019 supplies at each price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0037",
    "term": "Extension of supply",
    "definition_text": "A rise in quantity supplied caused by a rise in price (movement along the curve).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0038",
    "term": "Contraction of supply",
    "definition_text": "A fall in quantity supplied caused by a fall in price (movement along the curve).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0039",
    "term": "Increase in supply",
    "definition_text": "A rightward shift of the supply curve; more is supplied at every price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0040",
    "term": "Decrease in supply",
    "definition_text": "A leftward shift of the supply curve; less is supplied at every price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0041",
    "term": "Price mechanism",
    "definition_text": "The way demand and supply interact through price changes to allocate resources.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0042",
    "term": "Market equilibrium",
    "definition_text": "The point where quantity demanded equals quantity supplied.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0043",
    "term": "Equilibrium price",
    "definition_text": "The price at which quantity demanded equals quantity supplied.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0044",
    "term": "Equilibrium quantity",
    "definition_text": "The quantity bought and sold at the equilibrium price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0045",
    "term": "Market disequilibrium",
    "definition_text": "A situation where quantity demanded does not equal quantity supplied.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0046",
    "term": "Shortage (excess demand)",
    "definition_text": "Demand exceeds supply at the current price, which tends to push prices up.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0047",
    "term": "Surplus (excess supply)",
    "definition_text": "Supply exceeds demand at the current price, which tends to push prices down.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0048",
    "term": "Price elasticity of demand (PED)",
    "definition_text": "The responsiveness of quantity demanded to a change in price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0049",
    "term": "PED formula",
    "definition_text": "% change in quantity demanded \u00f7 % change in price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0050",
    "term": "Price elasticity of supply (PES)",
    "definition_text": "The responsiveness of quantity supplied to a change in price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0051",
    "term": "PES formula",
    "definition_text": "% change in quantity supplied \u00f7 % change in price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0052",
    "term": "Perfectly inelastic",
    "definition_text": "Elasticity of 0; quantity does not change when price changes (vertical curve).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0053",
    "term": "Inelastic",
    "definition_text": "Elasticity between 0 and 1; quantity changes proportionally less than price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0054",
    "term": "Unitary elastic",
    "definition_text": "Elasticity of exactly 1; quantity changes by the same percentage as price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0055",
    "term": "Elastic",
    "definition_text": "Elasticity greater than 1; quantity changes proportionally more than price.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0056",
    "term": "Perfectly elastic",
    "definition_text": "Elasticity of infinity; any price change causes quantity to fall or rise to zero (horizontal curve).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0057",
    "term": "Consumer expenditure",
    "definition_text": "The total amount spent by consumers on a good: price \u00d7 quantity.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0058",
    "term": "Total revenue (TR)",
    "definition_text": "The income a firm receives from sales: price \u00d7 quantity sold.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0059",
    "term": "Market economic system",
    "definition_text": "An economy where resources are allocated by the price mechanism with private ownership and little government intervention.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0060",
    "term": "Mixed economic system",
    "definition_text": "An economy where resources are allocated by both the private sector (market) and the government (public sector).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0061",
    "term": "Market failure",
    "definition_text": "When the free market leads to a misallocation of resources.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0062",
    "term": "Public goods",
    "definition_text": "Goods that are non-rival and non-excludable, so the market will not provide them (e.g. street lighting).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0063",
    "term": "Merit goods",
    "definition_text": "Goods that give more benefit to society than consumers realise, so they are under-consumed (e.g. education).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0064",
    "term": "Demerit goods",
    "definition_text": "Goods that harm consumers and society more than people realise, so they are over-consumed (e.g. tobacco).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0065",
    "term": "Private benefits",
    "definition_text": "Benefits received by the individual consumer or producer of a good.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0066",
    "term": "External benefits",
    "definition_text": "Benefits to third parties who are not directly involved in the transaction.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0067",
    "term": "Social benefits",
    "definition_text": "Total benefits to society: private benefits plus external benefits.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0068",
    "term": "Private costs",
    "definition_text": "Costs paid by the individual consumer or producer.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0069",
    "term": "External costs",
    "definition_text": "Costs imposed on third parties who are not directly involved (e.g. pollution).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0070",
    "term": "Social costs",
    "definition_text": "Total costs to society: private costs plus external costs.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0071",
    "term": "Externality",
    "definition_text": "A cost or benefit that affects a third party outside the transaction.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0072",
    "term": "Monopoly",
    "definition_text": "A market with only one producer or a firm that dominates the market.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0073",
    "term": "Maximum price (price ceiling)",
    "definition_text": "A legal limit on how high a price can be charged.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0074",
    "term": "Minimum price (price floor)",
    "definition_text": "A legal limit on how low a price can be set.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0075",
    "term": "Indirect tax",
    "definition_text": "A tax on spending on goods and services, paid to the government through the seller (e.g. VAT).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0076",
    "term": "Subsidy",
    "definition_text": "A payment from the government to producers to lower their costs and encourage output.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0077",
    "term": "Regulation",
    "definition_text": "Rules and laws set by the government to control the behaviour of firms and consumers.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0078",
    "term": "Privatisation",
    "definition_text": "Transfer of ownership of an organisation from the public sector to the private sector.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0079",
    "term": "Nationalisation",
    "definition_text": "Transfer of ownership of a private firm to the government.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0080",
    "term": "Direct provision",
    "definition_text": "The government directly produces and supplies goods or services (e.g. state schools).",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0081",
    "term": "Quotas (resource extraction)",
    "definition_text": "Limits on the quantity of a natural resource that can be extracted or produced.",
    "category": "The allocation of resources",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "The allocation of resources"
    }
  },
  {
    "id": "def_0455_0082",
    "term": "Money",
    "definition_text": "Anything generally accepted as a means of payment for goods and services.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0083",
    "term": "Barter",
    "definition_text": "Direct exchange of goods and services without using money.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0084",
    "term": "Medium of exchange",
    "definition_text": "Function of money: accepted in payment for goods and services.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0085",
    "term": "Store of value",
    "definition_text": "Function of money: it keeps its purchasing power over time.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0086",
    "term": "Unit of account",
    "definition_text": "Function of money: it measures and compares the value of goods and services.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0087",
    "term": "Standard of deferred payment",
    "definition_text": "Function of money: it allows payment in the future.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0088",
    "term": "Central bank",
    "definition_text": "The government\u2019s bank that issues notes, manages monetary policy and supervises commercial banks.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0089",
    "term": "Commercial bank",
    "definition_text": "A private bank that accepts deposits, makes loans and provides financial services to households and firms.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0090",
    "term": "Household",
    "definition_text": "A person or group living together who make joint spending, saving and borrowing decisions.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0091",
    "term": "Saving",
    "definition_text": "Income not spent on current consumption.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0092",
    "term": "Borrowing",
    "definition_text": "Obtaining money that must be repaid, usually with interest.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0093",
    "term": "Rate of interest",
    "definition_text": "The price of borrowing money or the reward for saving, shown as a percentage.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0094",
    "term": "Disposable income",
    "definition_text": "Income remaining after direct taxes have been paid.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0095",
    "term": "Consumer confidence",
    "definition_text": "How optimistic households feel about the economy and their own finances.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0096",
    "term": "Derived demand",
    "definition_text": "Demand for a factor of production that depends on demand for the product it produces.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0097",
    "term": "Demand for labour",
    "definition_text": "The number of workers firms are willing and able to employ at each wage rate.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0098",
    "term": "Supply of labour",
    "definition_text": "The number of workers willing and able to work at each wage rate.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0099",
    "term": "Trade union",
    "definition_text": "An organisation of workers that negotiates for better pay and conditions.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0100",
    "term": "Bargaining power",
    "definition_text": "The ability of workers or firms to influence wages and working conditions.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0101",
    "term": "National minimum wage (NMW)",
    "definition_text": "A legally set lowest hourly wage an employer can pay.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0102",
    "term": "Wage differentials",
    "definition_text": "Differences in pay between workers or occupations.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0103",
    "term": "Discrimination (labour market)",
    "definition_text": "Unfair treatment of workers, for example by gender, resulting in different pay or opportunities.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0104",
    "term": "Occupational mobility of labour",
    "definition_text": "The ease with which workers can change jobs or skills.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0105",
    "term": "Geographical mobility of labour",
    "definition_text": "The ease with which workers can move to a different area to work.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0106",
    "term": "Division of labour (worker specialisation)",
    "definition_text": "Splitting production into tasks, each done by a worker who specialises in it.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0107",
    "term": "Primary sector",
    "definition_text": "Firms that extract natural resources (e.g. farming, mining).",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0108",
    "term": "Secondary sector",
    "definition_text": "Firms that manufacture and construct goods from raw materials.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0109",
    "term": "Tertiary sector",
    "definition_text": "Firms that provide services (e.g. banking, retail, transport).",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0110",
    "term": "Private sector",
    "definition_text": "Firms owned by individuals or groups, run to make a profit.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0111",
    "term": "Public sector",
    "definition_text": "Organisations owned and controlled by the government.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0112",
    "term": "Small firm",
    "definition_text": "A firm with a small number of employees and low output, often with a local market.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0113",
    "term": "Large firm",
    "definition_text": "A firm with many employees and high output, often benefiting from economies of scale.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0114",
    "term": "Merger",
    "definition_text": "When two or more firms join together to form one firm.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0115",
    "term": "Horizontal merger",
    "definition_text": "A merger between firms at the same stage of production in the same industry.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0116",
    "term": "Vertical merger",
    "definition_text": "A merger between firms at different stages of production in the same industry.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0117",
    "term": "Conglomerate merger",
    "definition_text": "A merger between firms in unrelated industries.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0118",
    "term": "Economies of scale",
    "definition_text": "Falls in average cost as the scale of production increases.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0119",
    "term": "Internal economies of scale",
    "definition_text": "Lower average costs arising from the growth of the individual firm.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0120",
    "term": "External economies of scale",
    "definition_text": "Lower average costs arising from the growth of the whole industry.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0121",
    "term": "Diseconomies of scale",
    "definition_text": "Rises in average cost when a firm or industry becomes too large.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0122",
    "term": "Labour-intensive production",
    "definition_text": "Production that uses a high proportion of labour relative to capital.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0123",
    "term": "Capital-intensive production",
    "definition_text": "Production that uses a high proportion of capital relative to labour.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0124",
    "term": "Production",
    "definition_text": "The total output of goods and services.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0125",
    "term": "Productivity",
    "definition_text": "Output per unit of input, e.g. output per worker.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0126",
    "term": "Investment",
    "definition_text": "Spending on capital goods that will be used to produce more output in future.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0127",
    "term": "Total cost (TC)",
    "definition_text": "All costs of production: FC + VC.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0128",
    "term": "Fixed cost (FC)",
    "definition_text": "Costs that do not change with output (e.g. rent).",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0129",
    "term": "Variable cost (VC)",
    "definition_text": "Costs that change with output (e.g. raw materials).",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0130",
    "term": "Average total cost (ATC)",
    "definition_text": "Cost per unit of output: TC \u00f7 output.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0131",
    "term": "Average fixed cost (AFC)",
    "definition_text": "Fixed cost per unit: FC \u00f7 output.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0132",
    "term": "Average variable cost (AVC)",
    "definition_text": "Variable cost per unit: VC \u00f7 output.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0133",
    "term": "Average revenue (AR)",
    "definition_text": "Revenue per unit sold: TR \u00f7 quantity sold.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0134",
    "term": "Profit (calculation)",
    "definition_text": "Total revenue minus total cost.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0135",
    "term": "Survival (objective)",
    "definition_text": "A firm\u2019s aim to stay in business, common for new or struggling firms.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0136",
    "term": "Social welfare (objective)",
    "definition_text": "A firm\u2019s aim to benefit society rather than to maximise profit.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0137",
    "term": "Profit maximisation (objective)",
    "definition_text": "A firm\u2019s aim to make the greatest possible difference between revenue and costs.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0138",
    "term": "Growth (objective)",
    "definition_text": "A firm\u2019s aim to increase its size, output or market share.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0139",
    "term": "Competitive market",
    "definition_text": "A market with many firms competing, where no single firm controls price.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0140",
    "term": "Monopoly market",
    "definition_text": "A market with only one firm, which may restrict supply and raise price.",
    "category": "Microeconomic decision-makers",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Microeconomic decision-makers"
    }
  },
  {
    "id": "def_0455_0141",
    "term": "Macroeconomic aims",
    "definition_text": "Government objectives: economic growth, full employment, stable prices, balance of payments stability, redistribution of income and environmental sustainability.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0142",
    "term": "Economic growth (definition)",
    "definition_text": "An increase in the output of goods and services in an economy over time.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0143",
    "term": "Full employment",
    "definition_text": "A situation where everyone who is willing and able to work has a job (very low unemployment).",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0144",
    "term": "Stable prices",
    "definition_text": "A low and steady rate of inflation.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0145",
    "term": "Balance of payments stability",
    "definition_text": "Avoiding large persistent deficits or surpluses on the current account.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0146",
    "term": "Redistribution of income",
    "definition_text": "Reducing the gap between rich and poor, often via taxes and benefits.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0147",
    "term": "Environmental sustainability",
    "definition_text": "Using resources so that future generations can meet their needs.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0148",
    "term": "Conflict of aims",
    "definition_text": "When achieving one macroeconomic aim makes another harder to achieve.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0149",
    "term": "Government budget",
    "definition_text": "The government\u2019s plan of expected spending and revenue for a year.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0150",
    "term": "Budget deficit",
    "definition_text": "When government spending is greater than government revenue.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0151",
    "term": "Budget surplus",
    "definition_text": "When government revenue is greater than government spending.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0152",
    "term": "Fiscal policy",
    "definition_text": "Government use of taxation and government spending to influence the economy.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0153",
    "term": "Government spending",
    "definition_text": "Money spent by the government on goods and services such as health, education and defence.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0154",
    "term": "Taxation",
    "definition_text": "Compulsory payments to the government.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0155",
    "term": "Direct tax",
    "definition_text": "A tax on income and wealth, paid directly to the government (e.g. income tax).",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0156",
    "term": "Indirect tax (macro)",
    "definition_text": "A tax on spending, collected by sellers (e.g. VAT, excise duty).",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0157",
    "term": "Progressive tax",
    "definition_text": "A tax where the percentage paid rises as income rises.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0158",
    "term": "Regressive tax",
    "definition_text": "A tax where the percentage paid falls as income rises.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0159",
    "term": "Proportional tax",
    "definition_text": "A tax where the same percentage is paid at all income levels.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0160",
    "term": "Total (aggregate) demand",
    "definition_text": "The total spending on goods and services in an economy.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0161",
    "term": "Monetary policy",
    "definition_text": "Government or central bank use of interest rates, money supply and exchange rates to influence the economy.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0162",
    "term": "Money supply",
    "definition_text": "The total amount of money in an economy.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0163",
    "term": "Supply-side policy",
    "definition_text": "Policies that aim to increase the productive capacity and efficiency of the economy.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0164",
    "term": "Education and training",
    "definition_text": "A supply-side measure that improves the quality and productivity of labour.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0165",
    "term": "Infrastructure spending",
    "definition_text": "Government spending on roads, rail, ports and utilities to improve productive capacity.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0166",
    "term": "Labour market reforms",
    "definition_text": "Changes that make the labour market more flexible and efficient.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0167",
    "term": "Deregulation",
    "definition_text": "Removing government rules and restrictions to increase competition.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0168",
    "term": "Real GDP",
    "definition_text": "The total value of output in an economy adjusted for inflation.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0169",
    "term": "Nominal GDP",
    "definition_text": "Gross Domestic Product measured at current prices, not adjusted for inflation.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0170",
    "term": "Gross Domestic Product (GDP)",
    "definition_text": "The total value of goods and services produced in an economy in a year.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0171",
    "term": "Recession",
    "definition_text": "A period of falling real GDP, usually for at least two consecutive quarters.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0172",
    "term": "Employment",
    "definition_text": "The state of having a paid job.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0173",
    "term": "Unemployment",
    "definition_text": "People who are willing and able to work and are actively seeking work but cannot find a job.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0174",
    "term": "Unemployment rate",
    "definition_text": "(Number unemployed \u00f7 labour force) \u00d7 100.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0175",
    "term": "Labour force",
    "definition_text": "All those who are employed or unemployed and seeking work.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0176",
    "term": "Labour force survey",
    "definition_text": "A survey that measures unemployment using the internationally agreed definition.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0177",
    "term": "Frictional unemployment",
    "definition_text": "Short-term unemployment while workers move between jobs.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0178",
    "term": "Structural unemployment",
    "definition_text": "Unemployment caused by the decline of an industry or a mismatch of skills.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0179",
    "term": "Cyclical unemployment",
    "definition_text": "Unemployment caused by a fall in total demand during a recession.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0180",
    "term": "Seasonal unemployment",
    "definition_text": "Unemployment caused by seasonal changes in demand for labour (e.g. tourism, farming).",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0181",
    "term": "Inflation",
    "definition_text": "A sustained rise in the general price level over time.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0182",
    "term": "Deflation",
    "definition_text": "A sustained fall in the general price level over time.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0183",
    "term": "Consumer Prices Index (CPI)",
    "definition_text": "A measure of inflation based on the weighted average price of a basket of goods and services.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0184",
    "term": "Weights (CPI)",
    "definition_text": "Numbers showing the importance of each item in the average household\u2019s spending.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0185",
    "term": "Demand-pull inflation",
    "definition_text": "Inflation caused by total demand rising faster than the economy\u2019s ability to produce.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0186",
    "term": "Cost-push inflation",
    "definition_text": "Inflation caused by rising costs of production (e.g. wages, raw materials).",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0187",
    "term": "Savers, lenders and borrowers",
    "definition_text": "Groups affected by inflation: savers and lenders lose purchasing power, while borrowers gain.",
    "category": "Government and the macroeconomy",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Government and the macroeconomy"
    }
  },
  {
    "id": "def_0455_0188",
    "term": "Living standards",
    "definition_text": "The level of material well-being of people in a country.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0189",
    "term": "Real GDP per head",
    "definition_text": "Real GDP divided by population; an indicator of average income.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0190",
    "term": "Human Development Index (HDI)",
    "definition_text": "A composite indicator of development based on life expectancy, education and income per head.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0191",
    "term": "Components of HDI",
    "definition_text": "Health (life expectancy), education (years of schooling) and income (GNI per head).",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0192",
    "term": "Income distribution",
    "definition_text": "How a country\u2019s total income is shared among its population.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0193",
    "term": "Absolute poverty",
    "definition_text": "Not having enough income to meet basic needs such as food, water and shelter.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0194",
    "term": "Relative poverty",
    "definition_text": "Having an income significantly below the average in a country.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0195",
    "term": "State benefits",
    "definition_text": "Payments from the government to people in need (e.g. unemployment benefit).",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0196",
    "term": "Birth rate",
    "definition_text": "The number of live births per 1,000 people in a year.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0197",
    "term": "Death rate",
    "definition_text": "The number of deaths per 1,000 people in a year.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0198",
    "term": "Net migration",
    "definition_text": "The difference between immigration and emigration.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0199",
    "term": "Immigration",
    "definition_text": "People moving into a country to live.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0200",
    "term": "Emigration",
    "definition_text": "People leaving a country to live elsewhere.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0201",
    "term": "Optimum population",
    "definition_text": "The population size that produces the highest output per head with available resources.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0202",
    "term": "Overpopulation",
    "definition_text": "A population too large for the resources available, leading to lower output per head.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0203",
    "term": "Underpopulation",
    "definition_text": "A population too small to make full use of resources.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0204",
    "term": "Population structure",
    "definition_text": "The breakdown of a population by age and gender.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0205",
    "term": "Ageing population",
    "definition_text": "A rising proportion of the population in older age groups.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0206",
    "term": "Economic development",
    "definition_text": "Improvement in the living standards and well-being of the people in a country.",
    "category": "Economic development",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Economic development"
    }
  },
  {
    "id": "def_0455_0207",
    "term": "Specialisation (by country)",
    "definition_text": "A country focusing on producing the goods and services it can make most efficiently or at lowest cost.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0208",
    "term": "Free trade",
    "definition_text": "International trade without barriers such as tariffs and quotas.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0209",
    "term": "Globalisation",
    "definition_text": "The growing integration and interdependence of economies through trade, finance, people and information.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0210",
    "term": "Multinational company (MNC)",
    "definition_text": "A firm with operations in more than one country.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0211",
    "term": "Host country",
    "definition_text": "The country where an MNC sets up operations.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0212",
    "term": "Home country",
    "definition_text": "The country where an MNC has its headquarters.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0213",
    "term": "Protectionism",
    "definition_text": "Government policies to shield domestic industries from foreign competition.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0214",
    "term": "Tariff",
    "definition_text": "A tax on imported goods.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0215",
    "term": "Import quota",
    "definition_text": "A limit on the quantity of a good that can be imported.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0216",
    "term": "Embargo",
    "definition_text": "A ban on trade with a country or on specific goods.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0217",
    "term": "Infant (sunrise) industry",
    "definition_text": "A new industry that may need protection until it is established.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0218",
    "term": "Declining (sunset) industry",
    "definition_text": "An old industry in decline that may be protected to slow job losses.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0219",
    "term": "Strategic industry",
    "definition_text": "An industry important to national security or the economy (e.g. defence, energy).",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0220",
    "term": "Dumping",
    "definition_text": "Selling goods abroad at prices below the cost of production.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0221",
    "term": "Exports",
    "definition_text": "Goods and services sold to other countries.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0222",
    "term": "Imports",
    "definition_text": "Goods and services bought from other countries.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0223",
    "term": "Foreign exchange rate",
    "definition_text": "The price of one currency expressed in terms of another.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0224",
    "term": "Floating exchange rate",
    "definition_text": "An exchange rate determined by the demand for and supply of a currency in the foreign exchange market.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0225",
    "term": "Appreciation",
    "definition_text": "A rise in the value of a currency against another under a floating rate.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0226",
    "term": "Depreciation",
    "definition_text": "A fall in the value of a currency against another under a floating rate.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0227",
    "term": "Speculation",
    "definition_text": "Buying or selling a currency in the hope of making a profit from changes in its value.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0228",
    "term": "Workers\u2019 remittances",
    "definition_text": "Money sent home by workers employed abroad.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0229",
    "term": "Current account",
    "definition_text": "The part of the balance of payments that records trade in goods and services and income flows.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0230",
    "term": "Trade in goods (visible trade)",
    "definition_text": "The value of physical goods exported minus goods imported.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0231",
    "term": "Trade in services (invisible trade)",
    "definition_text": "The value of services exported minus services imported.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0232",
    "term": "Primary income",
    "definition_text": "Income flows such as profits, interest and dividends, and wages earned abroad.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0233",
    "term": "Secondary income",
    "definition_text": "Transfers with nothing received in return, such as foreign aid and remittances.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0234",
    "term": "Current account deficit",
    "definition_text": "When money flowing out exceeds money flowing in on the current account.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0235",
    "term": "Current account surplus",
    "definition_text": "When money flowing in exceeds money flowing out on the current account.",
    "category": "International trade and globalisation",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "International trade and globalisation"
    }
  },
  {
    "id": "def_0455_0236",
    "term": "PED",
    "definition_text": "PED = % change in quantity demanded \u00f7 % change in price",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0237",
    "term": "PES",
    "definition_text": "PES = % change in quantity supplied \u00f7 % change in price",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0238",
    "term": "Total revenue",
    "definition_text": "Total revenue = price \u00d7 quantity",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0239",
    "term": "Total cost",
    "definition_text": "Total cost = fixed cost + variable cost",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0240",
    "term": "Average total cost",
    "definition_text": "Average total cost = total cost \u00f7 output",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0241",
    "term": "Average fixed cost",
    "definition_text": "Average fixed cost = fixed cost \u00f7 output",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0242",
    "term": "Average variable cost",
    "definition_text": "Average variable cost = variable cost \u00f7 output",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0243",
    "term": "Average revenue",
    "definition_text": "Average revenue = total revenue \u00f7 quantity",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0244",
    "term": "Profit",
    "definition_text": "Profit = total revenue \u2212 total cost",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0245",
    "term": "Unemployment rate",
    "definition_text": "Unemployment rate = (unemployed \u00f7 labour force) \u00d7 100",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0246",
    "term": "Budget balance",
    "definition_text": "Budget balance = government revenue \u2212 government spending",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0247",
    "term": "Current account balance",
    "definition_text": "Current account balance = (goods + services + primary income + secondary income)",
    "category": "Key formulas to remember",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Key formulas to remember"
    }
  },
  {
    "id": "def_0455_0248",
    "term": "Calculate",
    "definition_text": "work out from given facts, figures or information.",
    "category": "Command words",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Command words"
    }
  },
  {
    "id": "def_0455_0249",
    "term": "Compare",
    "definition_text": "identify/comment on similarities and/or differences.",
    "category": "Command words",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Command words"
    }
  },
  {
    "id": "def_0455_0250",
    "term": "Consider",
    "definition_text": "review and respond to given information.",
    "category": "Command words",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Command words"
    }
  },
  {
    "id": "def_0455_0251",
    "term": "Define",
    "definition_text": "give precise meaning.",
    "category": "Command words",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Command words"
    }
  },
  {
    "id": "def_0455_0252",
    "term": "Describe",
    "definition_text": "state the points of a topic / give characteristics and main features.",
    "category": "Command words",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Command words"
    }
  },
  {
    "id": "def_0455_0253",
    "term": "Discuss",
    "definition_text": "write about issue(s) or topic(s) in depth in a structured way, exploring two sides of an argument.",
    "category": "Command words",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Command words"
    }
  },
  {
    "id": "def_0455_0254",
    "term": "Explain",
    "definition_text": "set out purposes or reasons, make the relationships between things clear, provide the why and/or how and support with relevant evidence.",
    "category": "Command words",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Command words"
    }
  },
  {
    "id": "def_0455_0255",
    "term": "Give",
    "definition_text": "produce an answer from a given source or use/recall of knowledge.",
    "category": "Command words",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Command words"
    }
  },
  {
    "id": "def_0455_0256",
    "term": "Identify",
    "definition_text": "name/select/recognise.",
    "category": "Command words",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Command words"
    }
  },
  {
    "id": "def_0455_0257",
    "term": "State",
    "definition_text": "express in clear terms.",
    "category": "Command words",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Command words"
    }
  },
  {
    "id": "def_0455_0258",
    "term": "Analyse",
    "definition_text": "examine in detail to show meaning, identify elements and the relationship between them.",
    "category": "Command words",
    "source_label": "Cambridge IGCSE 0455 Syllabus (2027\u20132029)",
    "topic_id": null,
    "created_at": "2026-10-28T14:00:00.000Z",
    "source_document_id": null,
    "source_chunk_id": null,
    "knowledge_documents": null,
    "topics": {
      "name": "Command words"
    }
  }
];
