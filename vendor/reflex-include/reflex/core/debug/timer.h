#pragma once

#include "profiler.h"




//
//Secondary API

namespace Reflex
{

	class ScopeTimer;

	class ScopeProfiler;

}




//
//ScopeTimer

class Reflex::ScopeTimer
{
public:

	REFLEX_INLINE ScopeTimer(DebugOutput & scope, const CString::View & name)
		: scope(scope)
		, m_name(name)
		, m_time(Detail::GetElapsedTime())
	{
	}

	REFLEX_INLINE ~ScopeTimer()
	{
		scope.Log(m_name.Extract(), kSpace, ToCString(GetElapsedTime() * 1000.0, 3));
	}

	REFLEX_INLINE Float GetElapsedTime() const { return Float(Detail::GetElapsedTime() - m_time); }



private:

	DebugOutput & scope;

	DebugOutput::Buffer m_name;

	Float64 m_time;

};




//
//ScopeProfiler

class Reflex::ScopeProfiler
{
public:

	REFLEX_INLINE ScopeProfiler(DebugOutput::Profiler & profiler)
		: profiler(profiler)
		, m_time(Detail::GetElapsedTime())
	{
	}

	REFLEX_INLINE ~ScopeProfiler()
	{
		profiler.Write(GetElapsedTime());
	}

	REFLEX_INLINE Float GetElapsedTime() const { return Float(Detail::GetElapsedTime() - m_time); }



private:

	DebugOutput::Profiler & profiler;

	Float64 m_time;

};
