#pragma once

#include "../audioplugin.h"




//
//Primary API

namespace Reflex::Bootstrap
{

	class Control;	//widget to edit a parameter

}




//
//Control

class Reflex::Bootstrap::Control : public GLX::Object
{
public:

	[[nodiscard]] static TRef <Control> Create(AudioPlugin & instance, UInt paramidx);

	[[nodiscard]] static TRef <Control> Create(ConstTRef <ParamInfo> paraminfo, ConstTRef <Value32> value);
};




//
//impl

inline Reflex::TRef <Reflex::Bootstrap::Control> Reflex::Bootstrap::Control::Create(AudioPlugin & instance, UInt paramidx)
{
	auto control = Create(instance.GetParameterInfo(paramidx), instance.GetParameterValues()[paramidx]);

	GLX::BindEvent(control, GLX::kTransaction, [system = instance.instance, paramidx](GLX::Object & src, GLX::Event & e)
	{
		if (auto stage = GLX::GetTransactionStage(e))
		{
			switch (stage)
			{
			case GLX::kTransactionBegin:
				system->BeginAutomation(paramidx);
				break;

			case GLX::kTransactionPerform:
				system->Automate(paramidx, Data::GetFloat32(e, GLX::kvalue));
				break;

			case GLX::kTransactionEnd:
			case GLX::kTransactionCancel:
				system->EndAutomation(paramidx);
				break;

			default:
				break;
			}

			return true;
		}

		return false;
	});

	return control;
}
