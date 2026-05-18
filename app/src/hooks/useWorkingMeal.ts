import { useReducer } from 'react'
import type { WorkingMeal, WorkingMealTotals } from '@/lib/gemini'

const EMPTY_TOTALS: WorkingMealTotals = {
  calories: 0,
  protein_g: 0,
  fat_g: 0,
  carbs_g: 0,
  fiber_g: 0,
  sugar_g: 0,
}

const initialState: WorkingMeal = {
  components: [],
  totals: EMPTY_TOTALS,
  message: '',
}

type Action = { type: 'UPDATE'; payload: WorkingMeal } | { type: 'RESET' }

function reducer(_state: WorkingMeal, action: Action): WorkingMeal {
  switch (action.type) {
    case 'UPDATE':
      return action.payload
    case 'RESET':
      return initialState
  }
}

export function useWorkingMeal() {
  const [workingMeal, dispatch] = useReducer(reducer, initialState)

  function update(meal: WorkingMeal) {
    dispatch({ type: 'UPDATE', payload: meal })
  }

  function reset() {
    dispatch({ type: 'RESET' })
  }

  return { workingMeal, update, reset }
}
