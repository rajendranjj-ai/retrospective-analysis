interface QuestionSelectorProps {
  questionCategories: { [key: string]: string[] }
  orderedQuestions: string[]
  sections: { [key: string]: string[] }
  selectedCategory: string
  selectedSection: string
  selectedQuestion: string
  onCategoryChange: (category: string) => void
  onSectionChange: (section: string) => void
  onQuestionChange: (question: string) => void
}

export default function QuestionSelector({
  questionCategories,
  orderedQuestions,
  sections,
  selectedCategory,
  selectedSection,
  selectedQuestion,
  onCategoryChange,
  onSectionChange,
  onQuestionChange
}: QuestionSelectorProps) {
  // Determine which questions to show based on selected section
  const questionsToShow = selectedSection && selectedSection !== 'All Sections' && sections[selectedSection] 
    ? sections[selectedSection] 
    : orderedQuestions
  
  const sectionNames = Object.keys(sections || {})

  return (
    <div className="space-y-4">
      {/* Section Selector */}
      <div>
        <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-2">
          Select Section:
        </label>
        <select
          id="section"
          value={selectedSection}
          onChange={(e) => onSectionChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="All Sections">All Sections</option>
          {sectionNames.map((section) => (
            <option key={section} value={section}>
              {section} ({sections[section]?.length || 0} questions)
            </option>
          ))}
        </select>
      </div>

      {/* Question Selector */}
      <div>
        <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
          Select Question:
        </label>
        <select
          id="question"
          value={selectedQuestion}
          onChange={(e) => onQuestionChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Choose a question...</option>
          {questionsToShow.map((question, index) => (
            <option key={question} value={question}>
              {index + 1}. {question.length > 80 ? `${question.substring(0, 80)}...` : question}
            </option>
          ))}
        </select>
      </div>

      {/* Show question count info */}
      <div className="text-sm text-gray-600">
        {selectedSection && selectedSection !== 'All Sections' 
          ? `Showing ${questionsToShow.length} questions from "${selectedSection}" section`
          : `Showing all ${questionsToShow.length} questions`
        }
      </div>
    </div>
  )
} 