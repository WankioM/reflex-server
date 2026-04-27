#pragma once

#include "functions/allocate.h"




//
//Detail

namespace Reflex::Detail
{

	template <class TYPE> struct Initialiser;

}




//
//Detail::Initialiser

template <class TYPE>
struct Reflex::Detail::Initialiser
{
	template <class ...VARGS> inline void Init(VARGS &&... v)
	{
		Constructor<TYPE>::Construct(m_raw, std::forward<VARGS>(v)...);
	}

	inline void Deinit()
	{
		Constructor<TYPE>::Destruct(*this);
	}

	operator TYPE &() { return *Reinterpret<TYPE>(m_raw); }

	TYPE * Adr() { return Reinterpret<TYPE>(m_raw); }

	const TYPE * Adr() const { return Reinterpret<TYPE>(m_raw); }

	TYPE * operator->() { return Adr(); }

	const TYPE * operator->() const { return Adr(); }

	TYPE & operator*() { return *Adr(); }

	const TYPE & operator*() const { return *Adr(); }

	alignas(alignof(TYPE)) UInt8 m_raw[sizeof(TYPE)];
};
